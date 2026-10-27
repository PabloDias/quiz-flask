from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_session import Session
import random
import json
import os
import sys
import math

# ══════════════════════════════════════════════════════════════
#  CÓDIGOS DE ACESSO
#  Para trocar uma senha, edite apenas o valor entre aspas.
# ══════════════════════════════════════════════════════════════
CODIGO_PISCICULTURA = 'peixe'   # acesso: só Piscicultura
CODIGO_MISTO        = '12345'   # acesso: Classico + Aprendizagem + Agroquiz Jovem EXPOCODO
CODIGO_TODOS        = 'dias'    # acesso: tudo + Configuracoes

# ══════════════════════════════════════════════════════════════
#  AGROQUIZ JOVEM EXPOCODO — 52a EXPOCODO 2026 (Codo-MA)
#  Tema: "A Forca Jovem no Agro"
#  8 categorias, 1 pergunta sorteada por categoria por partida.
#  Pontuacao ponderada: Tecnologia/Geoprocessamento/Empreendedorismo
#  valem 2 pontos, as demais valem 1 ponto (maximo = 11 pontos).
# ══════════════════════════════════════════════════════════════
CATEGORIAS_EXPOCODO = [
    'Clima', 'Producao Rural', 'Sustentabilidade', 'Piscicultura',
    'Servicos da SAGRIMA', 'Tecnologia', 'Geoprocessamento', 'Empreendedorismo'
]

PESO_CATEGORIA_EXPOCODO = {
    'Tecnologia':       2,
    'Geoprocessamento': 2,
    'Empreendedorismo': 2,
    # demais categorias nao listadas aqui valem peso 1 (ver .get(categoria, 1))
}

MAX_PONTOS_EXPOCODO = sum(PESO_CATEGORIA_EXPOCODO.get(c, 1) for c in CATEGORIAS_EXPOCODO)  # = 11

FAIXAS_EXPOCODO = [
    (0, 2,  'Explorador do Agro'),
    (3, 5,  'Jovem Inovador'),
    (6, 8,  'Especialista AgroTech'),
    (9, 11, 'Futuro Empreendedor Rural'),
]

def calcular_faixa_expocodo(pontos):
    """Retorna o nome da faixa correspondente a pontuacao ponderada do Agroquiz Jovem."""
    for minimo, maximo, nome in FAIXAS_EXPOCODO:
        if minimo <= pontos <= maximo:
            return nome
    return FAIXAS_EXPOCODO[-1][2]

# --- FUNÇÃO AUXILIAR PARA CAMINHOS (PyInstaller) ---
def resource_path(relative_path):
    """ Retorna o caminho absoluto para o recurso, funciona para dev e para o PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def writable_path(relative_path):
    """Retorna um caminho GRAVAVEL, fora do sys._MEIPASS.
    Usado para qualquer arquivo que precisa persistir entre execucoes
    do .exe (placar, config, sessao). sys._MEIPASS e uma pasta temporaria
    apagada quando o programa fecha - nunca gravar nela.
    Usa a pasta onde o .exe esta (ou o diretorio atual, em modo dev),
    dentro de uma subpasta 'dados_salvos' criada na primeira execucao."""
    if getattr(sys, 'frozen', False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.abspath(".")
    pasta_dados = os.path.join(base_path, 'dados_salvos')
    os.makedirs(pasta_dados, exist_ok=True)
    return os.path.join(pasta_dados, relative_path)

# --- CONFIGURAÇÃO DO APP FLASK ---
template_folder = resource_path('templates')
static_folder   = resource_path('static')
app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)

app.config['SECRET_KEY']      = 'sua-chave-secreta-muito-dificil'
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"]    = "filesystem"
Session(app)

# --- FUNÇÕES DE CONFIGURAÇÃO ---
def carregar_config():
    """Carrega as configurações do arquivo config.json."""
    try:
        with open(resource_path('config.json'), 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'perguntas_por_partida': 5}

def salvar_config(config):
    """Salva as configurações no arquivo config.json."""
    with open(resource_path('config.json'), 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=4)

# --- FUNÇÕES AUXILIARES DO JOGO ---
def carregar_perguntas(nome_arquivo):
    """Lê um arquivo de perguntas, extraindo também a linha de explicação."""
    perguntas = []
    try:
        with open(resource_path(nome_arquivo), 'r', encoding='utf-8') as f:
            blocos_de_perguntas = f.read().strip().split('---')
            for bloco in blocos_de_perguntas:
                if not bloco.strip():
                    continue
                linhas = [linha.strip() for linha in bloco.strip().split('\n') if linha.strip()]
                if len(linhas) < 2:
                    continue
                texto_pergunta    = None
                texto_explicacao  = None
                texto_categoria   = None
                linhas_sem_extras = []
                for linha in linhas:
                    if linha.lower().startswith('explicacao:'):
                        texto_explicacao = linha.split(':', 1)[1].strip()
                    elif linha.lower().startswith('categoria:'):
                        texto_categoria = linha.split(':', 1)[1].strip()
                    elif texto_pergunta is None:
                        texto_pergunta = linha
                    else:
                        linhas_sem_extras.append(linha)
                if not texto_pergunta:
                    continue
                opcoes_raw       = linhas_sem_extras
                resposta_correta = ""
                textos_das_opcoes = []
                for opcao in opcoes_raw:
                    if opcao.startswith('*'):
                        resposta_correta = opcao[1:]
                        textos_das_opcoes.append(opcao[1:])
                    else:
                        textos_das_opcoes.append(opcao)
                if not resposta_correta:
                    continue
                perguntas.append({
                    'pergunta':   texto_pergunta,
                    'opcoes':     textos_das_opcoes,
                    'resposta':   resposta_correta,
                    'explicacao': texto_explicacao,
                    'categoria':  texto_categoria
                })
    except FileNotFoundError:
        print(f"AVISO: O arquivo '{nome_arquivo}' não foi encontrado.")
        return []
    return perguntas

def carregar_placar(modo):
    """Lê o placar do arquivo JSON para um modo específico."""
    nome_arquivo = resource_path(f"placar_{modo}.json")
    try:
        with open(nome_arquivo, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def salvar_placar(placar, modo):
    """Salva o placar no arquivo JSON de um modo específico."""
    nome_arquivo    = resource_path(f"placar_{modo}.json")
    placar_ordenado = sorted(placar, key=lambda x: x['pontos'], reverse=True)
    placar_top10    = placar_ordenado[:10]
    with open(nome_arquivo, 'w', encoding='utf-8') as f:
        json.dump(placar_top10, f, ensure_ascii=False, indent=4)

# ══════════════════════════════════════════════════════════════
#  TABELA DE NÍVEIS DE ACESSO
#  Cada nível define quais modos aparecem no home.html.
#
#  access_level   | Classico | Aprendizagem | Piscicultura | Agroquiz Jovem | Config
#  ──────────────────────────────────────────────────────────────────────────────
#  'piscicultura' |    X     |      X       |      V       |       X        |   X
#  'misto'        |    V     |      V       |      X       |       V        |   X
#  'todos'        |    V     |      V       |      V       |       V        |   V
# ══════════════════════════════════════════════════════════════

# --- ROTAS DA APLICAÇÃO ---

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/logout')
def logout():
    """Limpa a sessão e volta para a tela de login."""
    session.clear()
    return redirect(url_for('home'))

@app.route('/login', methods=['POST'])
def login():
    codigo_inserido = request.form.get('codigo_acesso', '').strip()

    if codigo_inserido == CODIGO_TODOS:
        session['access_level'] = 'todos'
    elif codigo_inserido == CODIGO_MISTO:
        session['access_level'] = 'misto'
    elif codigo_inserido == CODIGO_PISCICULTURA:
        session['access_level'] = 'piscicultura'
    # código errado: não define access_level, home.html mostrará o login novamente

    return redirect(url_for('home'))

@app.route('/configuracao', methods=['GET'])
def configuracao():
    # Apenas nível 'todos' pode acessar configurações
    if session.get('access_level') != 'todos':
        return redirect(url_for('home'))
    config = carregar_config()
    return render_template('configuracao.html', config=config)

@app.route('/salvar-configuracao', methods=['POST'])
def salvar_configuracao():
    if session.get('access_level') != 'todos':
        return redirect(url_for('home'))
    try:
        num_perguntas = int(request.form.get('num_perguntas', 5))
    except ValueError:
        num_perguntas = 5
    config = carregar_config()
    config['perguntas_por_partida'] = num_perguntas
    salvar_config(config)
    return redirect(url_for('home'))

@app.route('/iniciar/<modo_de_jogo>')
def iniciar_jogo(modo_de_jogo):
    session['modo_de_jogo'] = modo_de_jogo
    session['pontuacao']    = 0
    session['acertos']      = 0

    if modo_de_jogo == 'expocodo_jovem':
        # Sorteia exatamente 1 pergunta por categoria (8 categorias = 8 perguntas por partida)
        todas_perguntas = carregar_perguntas('perguntas_expocodo_jovem.txt')
        if not todas_perguntas:
            return redirect(url_for('home'))
        indices_por_categoria = {}
        for indice, pergunta in enumerate(todas_perguntas):
            indices_por_categoria.setdefault(pergunta.get('categoria'), []).append(indice)
        indices_sorteados = [random.choice(indices) for indices in indices_por_categoria.values() if indices]
        random.shuffle(indices_sorteados)
        session['lista_de_perguntas']  = todas_perguntas
        session['ordem_perguntas']     = indices_sorteados
        session['respostas_expocodo']  = []
        return redirect(url_for('exibir_pergunta', id_pergunta=0))

    config        = carregar_config()
    num_perguntas = config.get('perguntas_por_partida', 5)
    arquivos_quiz = {
        'classico':     'perguntas.txt',
        'aprendizagem': 'perguntas_infantil.txt',
        'piscicultura': 'perguntas_piscicultura.txt',
    }
    arquivo_selecionado        = arquivos_quiz.get(modo_de_jogo, 'perguntas.txt')
    lista_de_perguntas_completa = carregar_perguntas(arquivo_selecionado)
    if not lista_de_perguntas_completa:
        return redirect(url_for('home'))
    session['lista_de_perguntas'] = lista_de_perguntas_completa
    indices_disponiveis           = list(range(len(lista_de_perguntas_completa)))
    num_a_sortear                 = min(num_perguntas, len(indices_disponiveis))
    indices_sorteados             = random.sample(indices_disponiveis, num_a_sortear)
    session['ordem_perguntas']    = indices_sorteados
    return redirect(url_for('exibir_pergunta', id_pergunta=0))

@app.route('/quiz/<int:id_pergunta>')
def exibir_pergunta(id_pergunta):
    lista_de_perguntas = session.get('lista_de_perguntas', [])
    ordem_perguntas    = session.get('ordem_perguntas', [])
    modo_de_jogo       = session.get('modo_de_jogo', 'classico')
    if id_pergunta >= len(ordem_perguntas):
        return redirect(url_for('resultado'))
    try:
        id_real_pergunta      = ordem_perguntas[id_pergunta]
        questao_original      = lista_de_perguntas[id_real_pergunta]
        opcoes_para_embaralhar = list(questao_original['opcoes'])
        random.shuffle(opcoes_para_embaralhar)
        session['ordem_respostas_atual'] = opcoes_para_embaralhar
        kahoot_defaults = [
            {'cor': '#c0392b', 'icone': 'A'},
            {'cor': '#3498db', 'icone': 'B'},
            {'cor': '#e67e22', 'icone': 'C'},
            {'cor': '#9b59b6', 'icone': 'D'},
        ]
        opcoes_formatadas = [
            {'texto': texto, 'cor': default['cor'], 'icone': default['icone']}
            for texto, default in zip(opcoes_para_embaralhar, kahoot_defaults)
        ]
        return render_template('index.html',
                               pergunta=questao_original['pergunta'],
                               opcoes=opcoes_formatadas,
                               id_pergunta=id_pergunta,
                               modo=modo_de_jogo)
    except IndexError:
        return redirect(url_for('resultado'))

@app.route('/responder/<int:id_pergunta>', methods=['POST'])
def responder(id_pergunta):
    lista_de_perguntas = session.get('lista_de_perguntas', [])
    ordem_perguntas    = session.get('ordem_perguntas', [])
    id_real_pergunta   = ordem_perguntas[id_pergunta]
    questao_original   = lista_de_perguntas[id_real_pergunta]
    resposta_correta   = questao_original['resposta']
    resposta_jogador   = request.form['opcao']
    tempo_levado       = int(request.form.get('tempo_levado', 30))
    modo_de_jogo       = session.get('modo_de_jogo', 'classico')
    acertou            = (resposta_jogador == resposta_correta)

    if modo_de_jogo == 'expocodo_jovem':
        categoria     = questao_original.get('categoria')
        peso          = PESO_CATEGORIA_EXPOCODO.get(categoria, 1)
        pontos_ganhos = peso if acertou else 0
        if acertou:
            session['acertos'] = session.get('acertos', 0) + 1
        session['pontuacao'] = session.get('pontuacao', 0) + pontos_ganhos

        respostas_expocodo = session.get('respostas_expocodo', [])
        respostas_expocodo.append({'categoria': categoria, 'acertou': acertou})
        session['respostas_expocodo'] = respostas_expocodo

        proximo_id = id_pergunta + 1
        if proximo_id >= len(ordem_perguntas):
            return redirect(url_for('animacao'))
        return redirect(url_for('exibir_pergunta', id_pergunta=proximo_id))

    # --- fluxo original (Classico / Aprendizagem / Piscicultura), intocado ---
    pontos_ganhos = 0
    if acertou:
        session['acertos'] = session.get('acertos', 0) + 1
        if tempo_levado < 30:
            pontos_ganhos = 500 + int(500 * ((30 - tempo_levado) / 30))
        else:
            pontos_ganhos = 100
    session['pontuacao'] = session.get('pontuacao', 0) + pontos_ganhos
    if modo_de_jogo in ['aprendizagem', 'piscicultura']:
        session['ultima_resposta_jogador'] = resposta_jogador
        return redirect(url_for('revisao', id_pergunta=id_pergunta))
    else:
        proximo_id = id_pergunta + 1
        if proximo_id >= len(ordem_perguntas):
            return redirect(url_for('animacao'))
        else:
            return redirect(url_for('exibir_pergunta', id_pergunta=proximo_id))

@app.route('/revisao/<int:id_pergunta>')
def revisao(id_pergunta):
    ordem_perguntas  = session.get('ordem_perguntas', [])
    lista_de_perguntas = session.get('lista_de_perguntas', [])
    id_real_pergunta = ordem_perguntas[id_pergunta]
    questao_original = lista_de_perguntas[id_real_pergunta]
    opcoes_mostradas = session.get('ordem_respostas_atual', [])
    dados_revisao = {
        'pergunta':        questao_original['pergunta'],
        'opcoes_mostradas': opcoes_mostradas,
        'resposta_correta': questao_original['resposta'],
        'resposta_jogador': session.get('ultima_resposta_jogador'),
        'explicacao':       questao_original.get('explicacao'),
    }
    proximo_id = id_pergunta + 1
    return render_template('revisao.html', revisao=dados_revisao, proximo_id=proximo_id)

@app.route('/animacao')
def animacao():
    modo_de_jogo = session.get('modo_de_jogo', 'classico')
    return render_template('animacao.html', modo=modo_de_jogo)

@app.route('/resultado')
def resultado():
    pontuacao       = session.get('pontuacao', 0)
    total_perguntas = len(session.get('ordem_perguntas', []))
    acertos         = session.get('acertos', 0)
    modo            = session.get('modo_de_jogo', 'classico')

    contexto = dict(pontuacao=pontuacao, total=total_perguntas, acertos=acertos, modo=modo)

    if modo == 'expocodo_jovem':
        faixa_nome = calcular_faixa_expocodo(pontuacao)
        contexto.update(
            faixa_nome=faixa_nome,
            faixa_slug=faixa_nome.lower().replace(' ', '-'),
            max_pontos=MAX_PONTOS_EXPOCODO,
            respostas=session.get('respostas_expocodo', []),
        )

    return render_template('resultado.html', **contexto)

@app.route('/salvar-pontuacao', methods=['POST'])
def salvar_pontuacao():
    nick   = request.form['nick']
    pontos = session.get('pontuacao', 0)
    modo   = session.get('modo_de_jogo', 'classico')

    entrada = {'nick': nick, 'pontos': pontos}
    if modo == 'expocodo_jovem':
        entrada['faixa'] = calcular_faixa_expocodo(pontos)

    placar_atual = carregar_placar(modo)
    placar_atual.append(entrada)
    salvar_placar(placar_atual, modo)
    return redirect(url_for('exibir_placar', modo=modo, nick_recente=nick, pontos_recentes=pontos))

@app.route('/placar/<modo>')
def exibir_placar(modo):
    nick_recente   = request.args.get('nick_recente', None)
    pontos_recentes = int(request.args.get('pontos_recentes', -1))
    placar         = carregar_placar(modo)
    return render_template('placar.html', placar=placar, modo=modo,
                           nick_recente=nick_recente, pontos_recentes=pontos_recentes)

@app.route('/limpar-placar', methods=['POST'])
def limpar_placar():
    """Apaga o arquivo de placar para o modo de jogo selecionado."""
    if session.get('access_level') != 'todos':
        return redirect(url_for('home'))
    modo = request.form.get('modo_para_limpar')
    if modo in ['classico', 'aprendizagem', 'piscicultura']:
        nome_arquivo = resource_path(f"placar_{modo}.json")
        try:
            os.remove(nome_arquivo)
            print(f"Placar '{nome_arquivo}' foi limpo com sucesso.")
        except FileNotFoundError:
            print(f"Placar '{nome_arquivo}' não encontrado, nada a limpar.")
    return redirect(url_for('configuracao'))

# ══════════════════════════════════════════════════════════════
#  MODO AVENTURA QUIZ 2D  (jogo de plataforma side-scrolling)
#  Tudo abaixo desta linha é NOVO. Nada acima foi alterado
#  (apenas o import de `jsonify` na primeira linha).
# ══════════════════════════════════════════════════════════════

# Configuração do jogo — ajuste livremente.
# Os valores de "normal" são a base; "facil"/"dificil" sobrescrevem campos.
GAME_CONFIG = {
    "normal": {
        "correct_points":       100,   # pontos por acerto
        "fast_bonus":           50,    # bônus se responder em < fast_threshold
        "fast_threshold":       7,     # segundos para valer o bônus
        "wrong_penalty":        25,    # pontos perdidos por erro
        "level_complete_bonus": 500,   # bônus ao concluir a fase
        "life_bonus":           100,   # bônus por vida restante na vitória
        "lives":                3,     # vidas iniciais
        "threat_speed":         1.0,   # multiplicador de velocidade da ameaça
        "answer_time_limit":    15,    # segundos até a ameaça alcançar (visual)
        "questions_per_level":  None,  # None = usa 'perguntas_por_partida' do config.json
    },
    "facil":   {"lives": 5, "threat_speed": 0.6, "answer_time_limit": 25, "wrong_penalty": 0},
    "dificil": {"lives": 2, "threat_speed": 1.5, "answer_time_limit": 10, "wrong_penalty": 50},
}

GAME_QUIZ_FILES = {           # reusa os mesmos arquivos .txt do quiz clássico
    'classico':     'perguntas.txt',
    'aprendizagem': 'perguntas_infantil.txt',
    'piscicultura': 'perguntas_piscicultura.txt',
}

def _game_config(dificuldade):
    cfg = dict(GAME_CONFIG['normal'])
    cfg.update(GAME_CONFIG.get(dificuldade, {}))
    return cfg

def _modos_permitidos():
    nivel = session.get('access_level')
    if nivel == 'todos':
        return ['classico', 'aprendizagem', 'piscicultura']
    if nivel == 'misto':
        return ['classico', 'aprendizagem']
    if nivel == 'piscicultura':
        return ['piscicultura']
    return []

@app.route('/game')
def game():
    """Página do jogo de plataforma 2D (Phaser)."""
    permitidos = _modos_permitidos()
    if not permitidos:
        return redirect(url_for('home'))
    modo = request.args.get('modo', permitidos[0])
    if modo not in permitidos:
        modo = permitidos[0]
    dificuldade = request.args.get('dificuldade', 'normal')
    if dificuldade not in GAME_CONFIG:
        dificuldade = 'normal'
    return render_template('game.html', modo=modo, dificuldade=dificuldade,
                           modos_permitidos=permitidos)

@app.route('/api/game/questions')
def game_questions():
    """Sorteia perguntas e devolve JSON SEM o gabarito (validação no servidor)."""
    permitidos = _modos_permitidos()
    if not permitidos:
        return jsonify({'error': 'acesso negado'}), 403
    modo = request.args.get('modo', permitidos[0])
    if modo not in permitidos:
        return jsonify({'error': 'modo nao permitido'}), 403
    dificuldade = request.args.get('dificuldade', 'normal')
    if dificuldade not in GAME_CONFIG:
        dificuldade = 'normal'
    cfg = _game_config(dificuldade)

    perguntas = carregar_perguntas(GAME_QUIZ_FILES.get(modo, 'perguntas.txt'))
    if not perguntas:
        return jsonify({'error': 'sem perguntas'}), 404

    n = cfg['questions_per_level'] or carregar_config().get('perguntas_por_partida', 5)
    n = min(n, len(perguntas))
    sorteadas = random.sample(perguntas, n)

    letras = ['A', 'B', 'C', 'D', 'E', 'F']
    rodada, publicas = [], []
    for i, q in enumerate(sorteadas):
        opcoes = list(q['opcoes'])
        random.shuffle(opcoes)
        correta = letras[opcoes.index(q['resposta'])]
        rodada.append({'correta': correta,
                       'explicacao': q.get('explicacao'),
                       'respondida': False})
        publicas.append({
            'id': i,
            'question': q['pergunta'],
            'options': [{'id': letras[j], 'text': t} for j, t in enumerate(opcoes)],
            'theme': modo,
            'difficulty': dificuldade,
        })

    session['game_round']  = rodada
    session['game_score']  = 0
    session['game_hits']   = 0
    session['game_modo']   = modo
    session['game_dif']    = dificuldade
    return jsonify({'questions': publicas, 'config': cfg, 'modo': modo})

@app.route('/api/game/answer', methods=['POST'])
def game_answer():
    """Valida uma resposta no servidor e devolve gabarito + pontos."""
    data   = request.get_json(silent=True) or {}
    idx    = data.get('question_index')
    opcao  = data.get('option_id')
    tempo  = float(data.get('time_taken', 999))
    rodada = session.get('game_round', [])
    if idx is None or not isinstance(idx, int) or idx < 0 or idx >= len(rodada):
        return jsonify({'error': 'pergunta invalida'}), 400
    item = rodada[idx]
    if item['respondida']:
        return jsonify({'error': 'pergunta ja respondida'}), 400

    cfg     = _game_config(session.get('game_dif', 'normal'))
    correto = (opcao == item['correta'])
    pontos  = 0
    if correto:
        pontos = cfg['correct_points']
        if tempo < cfg['fast_threshold']:
            pontos += cfg['fast_bonus']
        session['game_hits'] = session.get('game_hits', 0) + 1
    else:
        pontos = -cfg['wrong_penalty']

    item['respondida'] = True
    session['game_round'] = rodada
    session['game_score'] = max(0, session.get('game_score', 0) + pontos)

    return jsonify({
        'correct':        correto,
        'correct_option': item['correta'],
        'explanation':    item['explicacao'],
        'points_awarded': pontos,
        'total_score':    session['game_score'],
        'fast':           correto and tempo < cfg['fast_threshold'],
    })

@app.route('/api/game/finish', methods=['POST'])
def game_finish():
    """Fecha a partida, aplica bônus de vitória e salva no ranking."""
    data     = request.get_json(silent=True) or {}
    vitoria  = bool(data.get('victory'))
    vidas    = int(data.get('lives_left', 0))
    nick     = str(data.get('nick', '')).strip()[:20]
    modo     = session.get('game_modo', 'classico')
    cfg      = _game_config(session.get('game_dif', 'normal'))

    pontos = session.get('game_score', 0)
    if vitoria:
        pontos += cfg['level_complete_bonus'] + max(0, vidas) * cfg['life_bonus']
    session['game_score'] = pontos

    salvo = False
    if nick:
        modo_placar = f'game_{modo}'           # reusa carregar/salvar_placar
        placar = carregar_placar(modo_placar)
        placar.append({'nick': nick, 'pontos': pontos})
        salvar_placar(placar, modo_placar)
        salvo = True

    return jsonify({'final_score': pontos,
                    'hits': session.get('game_hits', 0),
                    'saved': salvo,
                    'ranking_url': url_for('exibir_placar', modo=f'game_{modo}')})
# ══════════════════════════════════════════════════════════════
#  SIMULADOR DO PRODUTOR — EXPOCODO 2026
#  Modo separado do quiz de pergunta/resposta: decisoes com efeitos
#  cumulativos em 5 indicadores (Producao, Custos, Agua,
#  Sustentabilidade, Renda). 3 safras x 4 etapas = 12 decisoes.
#  Tudo abaixo e NOVO. Nada acima desta linha foi alterado
#  (exceto a adicao da funcao writable_path(), logo apos resource_path()).
# ══════════════════════════════════════════════════════════════

_decisoes_cache = None

def carregar_decisoes():
    """Carrega decisoes.json uma vez e mantem em cache em memoria.
    Conteudo READ-ONLY do jogo -> usa resource_path (nunca writable_path)."""
    global _decisoes_cache
    if _decisoes_cache is None:
        with open(resource_path('decisoes.json'), encoding='utf-8') as f:
            _decisoes_cache = json.load(f)
    return _decisoes_cache


def carregar_placar_simulador():
    """Placar e dado gravavel -> usa writable_path, fora do sys._MEIPASS."""
    try:
        with open(writable_path('placar_simulador.json'), encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def salvar_placar_simulador(placar):
    with open(writable_path('placar_simulador.json'), 'w', encoding='utf-8') as f:
        json.dump(placar, f, ensure_ascii=False, indent=2)


def montar_passos(dados):
    """Monta a sequencia fixa de 12 passos (3 safras x 4 etapas),
    sorteando 1 evento por safra do pool. Sorteado uma vez no inicio
    da partida e guardado na sessao - nao re-sorteia a cada refresh."""
    passos = []
    for safra in dados['safras']:
        passos.append({'tipo': 'preparo', 'ref_id': safra['preparo']['id']})
        evento = random.choice(dados['eventos'])
        passos.append({'tipo': 'evento', 'ref_id': evento['id']})
        passos.append({'tipo': 'manejo', 'ref_id': safra['manejo']['id']})
        passos.append({'tipo': 'venda', 'ref_id': safra['venda']['id']})
    return passos


def localizar_bloco_simulador(dados, ref_id):
    """Acha o bloco de decisao (preparo/manejo/venda/evento) pelo id,
    em qualquer safra ou no pool de eventos."""
    for safra in dados['safras']:
        for etapa in ('preparo', 'manejo', 'venda'):
            if safra[etapa]['id'] == ref_id:
                return safra[etapa]
    for evento in dados['eventos']:
        if evento['id'] == ref_id:
            return evento
    raise ValueError(f'bloco de decisao nao encontrado: {ref_id}')


def _clamp_simulador(v):
    return max(0, min(100, v))


def aplicar_efeitos_simulador(indicadores, opcao, cultura):
    """Aplica os efeitos da opcao escolhida, reescalando por peso da
    cultura quando a opcao tiver as flags escala_renda / escala_agua /
    escala_tag. Retorna (novo_dict, efeitos_reais_aplicados)."""
    pesos = cultura['pesos']
    efeitos_reais = {}
    novo = dict(indicadores)
    for chave in ('producao', 'custos', 'agua', 'sustentabilidade', 'renda'):
        val = opcao['efeitos'].get(chave, 0)
        if chave == 'renda' and opcao['efeitos'].get('escala_renda'):
            val = val * pesos['renda_venda']
        elif chave == 'agua' and opcao['efeitos'].get('escala_agua'):
            val = val * pesos['sede_agua']
        elif opcao['efeitos'].get('escala_tag'):
            tag = opcao.get('_tag_peso')
            if tag and chave in ('agua', 'sustentabilidade'):
                val = val * pesos.get(tag, 1.0)
        novo[chave] = _clamp_simulador(novo[chave] + val)
        efeitos_reais[chave] = novo[chave] - indicadores[chave]
    return novo, efeitos_reais


def calcular_score_simulador(indicadores):
    return (indicadores['producao'] + (100 - indicadores['custos'])
            + indicadores['agua'] + indicadores['sustentabilidade']
            + indicadores['renda'])


def faixa_do_score_simulador(dados, score):
    for faixa in dados['faixas_resultado']:
        if score >= faixa['min']:
            return faixa
    return dados['faixas_resultado'][-1]


def estado_talhao_simulador(passo_no_total):
    """Deriva o estado visual dos talhoes a partir da posicao dentro
    da safra atual (0=preparo,1=evento,2=manejo,3=venda)."""
    posicao_na_safra = passo_no_total % 4
    return ['vazio', 'broto', 'meio', 'maduro'][posicao_na_safra]


ICONE_EMOJI_SIMULADOR = {
    'solo': '🌱', 'broto': '🌿', 'estrutura': '🏗️', 'agua': '💧',
    'documento': '📄', 'planta': '🪴', 'moeda': '💰',
    'chuva': '🌧️', 'sol': '☀️', 'praga': '🐛', 'geada': '❄️',
    'tecnologia': '📡',
}

CULTURAS_VIEW_SIMULADOR = [
    {'id': 'mandioca', 'nome': 'Mandioca', 'tagline': 'Rústica e resiliente', 'sprite': 'tile_0002.png'},
    {'id': 'hortalicas', 'nome': 'Hortaliças', 'tagline': 'Rápido giro, alto cuidado', 'sprite': 'tile_0020.png'},
    {'id': 'soja', 'nome': 'Soja', 'tagline': 'Escala e mercado forte', 'sprite': 'tile_0032.png'},
    {'id': 'gado_leiteiro', 'nome': 'Gado Leiteiro', 'tagline': 'Renda constante, rotina exigente', 'sprite': 'tile_0121.png'},
]

# Visual do selo por faixa - chaves batem com "selo" em faixas_resultado do decisoes.json
TIERS_VISUAL = {
    'ouro':    {'color': 'oklch(0.8 0.15 85)',   'ring': 'oklch(0.8 0.15 85 / 0.22)',   'gradient': 'linear-gradient(135deg, oklch(0.85 0.14 90), oklch(0.72 0.15 75))', 'initial': 'O'},
    'prata':   {'color': 'oklch(0.82 0.01 260)', 'ring': 'oklch(0.82 0.01 260 / 0.22)', 'gradient': 'linear-gradient(135deg, oklch(0.9 0.005 260), oklch(0.72 0.01 260))', 'initial': 'P'},
    'bronze':  {'color': 'oklch(0.62 0.1 45)',   'ring': 'oklch(0.62 0.1 45 / 0.22)',   'gradient': 'linear-gradient(135deg, oklch(0.68 0.11 50), oklch(0.5 0.1 40))', 'initial': 'B'},
    'semente': {'color': 'var(--green)',         'ring': 'oklch(0.64 0.135 145 / 0.22)','gradient': 'linear-gradient(135deg, oklch(0.7 0.13 145), oklch(0.55 0.11 145))', 'initial': 'S'},
}

MAX_SCORE_SIMULADOR = 500  # 5 indicadores x 100, com custos ja invertido na formula


def calcular_radar(indicadores):
    """Porta pra Python a mesma matematica de radar/pentagono que estava em
    JS no mockup do Claude Design. cx/cy/maxR/angulos identicos, so pra
    poder desenhar o SVG server-side (Jinja nao tem seno/cosseno)."""
    ordem = [
        ('Produção', indicadores['producao']),
        ('Custos', indicadores['custos']),
        ('Água', indicadores['agua']),
        ('Sustentabilidade', indicadores['sustentabilidade']),
        ('Renda', indicadores['renda']),
    ]
    cx, cy, max_r, n = 200, 200, 150, len(ordem)

    def angulo(i):
        return -math.pi / 2 + (i * 2 * math.pi) / n

    def ponto(i, r):
        a = angulo(i)
        return {'x': cx + r * math.cos(a), 'y': cy + r * math.sin(a)}

    grid_rings = []
    for frac in (0.2, 0.4, 0.6, 0.8, 1.0):
        pontos = [ponto(i, max_r * frac) for i in range(n)]
        grid_rings.append(' '.join(f"{p['x']:.1f},{p['y']:.1f}" for p in pontos))

    axis_lines = [ponto(i, max_r) for i in range(n)]

    data_dots = [ponto(i, (valor / 100) * max_r) for i, (_, valor) in enumerate(ordem)]
    data_points = ' '.join(f"{p['x']:.1f},{p['y']:.1f}" for p in data_dots)

    label_r = max_r + 32
    axis_labels = []
    for i, (nome, _) in enumerate(ordem):
        p = ponto(i, label_r)
        if p['x'] < cx - 5:
            anchor = 'end'
        elif p['x'] > cx + 5:
            anchor = 'start'
        else:
            anchor = 'middle'
        axis_labels.append({'x': p['x'], 'y': p['y'], 'anchor': anchor, 'text': nome})

    return {
        'grid_rings': grid_rings,
        'axis_lines': axis_lines,
        'data_points': data_points,
        'data_dots': data_dots,
        'axis_labels': axis_labels,
    }


def listar_todos_servicos(dados):
    """Coleta, em ordem de primeira aparicao, todos os nomes de servico_sagrima
    possiveis no jogo (safras + eventos), sem repetir."""
    vistos = []
    for safra in dados['safras']:
        for etapa in ('preparo', 'manejo', 'venda'):
            for opcao in safra[etapa]['opcoes']:
                nome = opcao.get('servico_sagrima')
                if nome and nome not in vistos:
                    vistos.append(nome)
    for evento in dados['eventos']:
        for opcao in evento['opcoes']:
            nome = opcao.get('servico_sagrima')
            if nome and nome not in vistos:
                vistos.append(nome)
    return vistos


@app.route('/simulador')
def simulador_home():
    # Mesmo padrao de acesso das demais rotas do projeto (ver configuracao()).
    # Simulador liberado para os niveis 'misto' e 'todos', junto do Agroquiz Jovem.
    if session.get('access_level') not in ('misto', 'todos'):
        return redirect(url_for('home'))
    return render_template('sim_home.html', culturas=CULTURAS_VIEW_SIMULADOR)


@app.route('/simulador/iniciar', methods=['POST'])
def simulador_iniciar():
    dados = carregar_decisoes()
    cultura_id = request.get_json(force=True).get('cultura', 'mandioca')
    cultura = next(c for c in dados['culturas'] if c['id'] == cultura_id)

    session['sim'] = {
        'cultura_id': cultura_id,
        'indicadores': dict(dados['indicadores_iniciais']),
        'passo': 0,
        'passos': montar_passos(dados),
        'servicos': [],
    }
    return jsonify({'ok': True})


@app.route('/simulador/decisao')
def simulador_decisao():
    if 'sim' not in session:
        return redirect(url_for('simulador_home'))

    dados = carregar_decisoes()
    sim = session['sim']

    if sim['passo'] >= len(sim['passos']):
        return redirect(url_for('simulador_resultado'))

    passo_atual = sim['passos'][sim['passo']]
    bloco = localizar_bloco_simulador(dados, passo_atual['ref_id'])

    safra_numero = (sim['passo'] // 4) + 1
    estado = estado_talhao_simulador(sim['passo'])
    talhoes = [{'n': i, 'estado': estado} for i in range(1, 7)]

    situacao = {
        'titulo': bloco['titulo'].upper(),
        'contexto': bloco['contexto'],
        'icone_emoji': ICONE_EMOJI_SIMULADOR.get(bloco.get('icone'), '🌱'),
    }
    opcoes = [{'id': o['id'], 'texto': o['texto']} for o in bloco['opcoes']]

    return render_template(
        'sim_decisao.html',
        safra_label=f'Safra {safra_numero}',
        decision_number=sim['passo'] + 1,
        decision_total=len(sim['passos']),
        situacao=situacao,
        opcoes=opcoes,
        indicadores=sim['indicadores'],
        talhoes=talhoes,
        cultura_id=sim['cultura_id'],
    )


@app.route('/simulador/escolher/<opcao_id>', methods=['POST'])
def simulador_escolher(opcao_id):
    if 'sim' not in session:
        return jsonify({'erro': 'sessao expirada'}), 400

    dados = carregar_decisoes()
    sim = session['sim']
    cultura = next(c for c in dados['culturas'] if c['id'] == sim['cultura_id'])

    passo_atual = sim['passos'][sim['passo']]
    bloco = localizar_bloco_simulador(dados, passo_atual['ref_id'])
    opcao = next(o for o in bloco['opcoes'] if o['id'] == opcao_id)

    if passo_atual['tipo'] == 'evento':
        opcao = dict(opcao)
        opcao['efeitos'] = dict(opcao['efeitos'])
        opcao['_tag_peso'] = bloco.get('tag_peso')

    novo_indicadores, efeitos_reais = aplicar_efeitos_simulador(sim['indicadores'], opcao, cultura)
    sim['indicadores'] = novo_indicadores

    if opcao.get('servico_sagrima'):
        sim['servicos'].append(opcao['servico_sagrima'])

    sim['passo'] += 1
    session['sim'] = sim  # reatribuir - obrigatorio p/ Flask-Session marcar como modificado

    return jsonify({
        'feedback': opcao['feedback'],
        'servico': opcao.get('servico_sagrima'),
        'atual': novo_indicadores,
        'efeitos': efeitos_reais,
        'fim': sim['passo'] >= len(sim['passos']),
    })


@app.route('/simulador/resultado')
def simulador_resultado():
    if 'sim' not in session:
        return redirect(url_for('simulador_home'))

    dados = carregar_decisoes()
    sim = session['sim']
    score = calcular_score_simulador(sim['indicadores'])
    faixa = faixa_do_score_simulador(dados, score)

    todos_servicos = listar_todos_servicos(dados)
    usados = set(sim['servicos'])
    servicos_todos = [{'nome': nome, 'usado': nome in usados} for nome in todos_servicos]

    tier = TIERS_VISUAL.get(faixa.get('selo'), TIERS_VISUAL['semente'])
    radar = calcular_radar(sim['indicadores'])

    resultado_sessao = {
        'cultura_id': sim['cultura_id'],
        'indicadores': sim['indicadores'],
        'score': score,
        'faixa': faixa,
        'servicos': sorted(usados),
    }
    session['sim_resultado'] = resultado_sessao

    return render_template(
        'sim_resultado.html',
        score=score,
        max_score=MAX_SCORE_SIMULADOR,
        faixa=faixa,
        indicadores=sim['indicadores'],
        servicos_todos=servicos_todos,
        radar=radar,
        tier=tier,
    )


@app.route('/simulador/salvar_nome', methods=['POST'])
def simulador_salvar_nome():
    """Chamado pela tela de resultado quando o visitante digita o nome
    no teclado virtual (reaproveitando o mesmo teclado do quiz)."""
    if 'sim_resultado' not in session:
        return jsonify({'erro': 'sem resultado na sessao'}), 400

    nome = request.get_json(force=True).get('nome', '').strip()[:40] or 'Anonimo'
    resultado = session['sim_resultado']

    placar = carregar_placar_simulador()
    placar.append({
        'nome': nome,
        'score': resultado['score'],
        'cultura': resultado['cultura_id'],
        'faixa': resultado['faixa']['titulo'],
    })
    placar.sort(key=lambda p: p['score'], reverse=True)
    salvar_placar_simulador(placar[:50])

    return jsonify({'ok': True})