# app.py - VERSÃO COMPLETA E CORRIGIDA

from flask import Flask, render_template, request, redirect, url_for, session
import random
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sua-chave-secreta-muito-dificil'

# --- ROTAS DA APLICAÇÃO ---

@app.route('/')
def home():
    """Renderiza a nova página inicial do quiz."""
    return render_template('home.html')

@app.route('/iniciar/<modo_de_jogo>')
# E a entrega como um PARÂMETRO para a função aqui -> (modo_de_jogo)
def iniciar_jogo(modo_de_jogo):
    """ Prepara a sessão e redireciona para a primeira pergunta do quiz. """
    
    # Guarda o modo de jogo na sessão para usarmos depois
    if modo_de_jogo in ['classico', 'aprendizagem']:
        session['modo_de_jogo'] = modo_de_jogo
    else:
        # Se o modo for inválido, assume o clássico como padrão
        session['modo_de_jogo'] = 'classico'

    NUMERO_DE_QUESTOES_POR_PARTIDA = 5
    indices_disponiveis = list(range(len(lista_de_perguntas)))
    num_a_sortear = min(NUMERO_DE_QUESTOES_POR_PARTIDA, len(indices_disponiveis))
    indices_sorteados = random.sample(indices_disponiveis, num_a_sortear)

    session['ordem_perguntas'] = indices_sorteados
    session['pontuacao'] = 0
    session['acertos'] = 0
    session['pergunta_atual_id'] = 0
    
    return redirect(url_for('exibir_pergunta', id_pergunta=0))

@app.route('/animacao')
def animacao():
    """Mostra a página de animação antes do resultado."""
    return render_template('animacao.html')

@app.route('/quiz/<int:id_pergunta>')
def exibir_pergunta(id_pergunta):
    """ Exibe a pergunta, embaralhando suas opções e guardando a ordem. """
    ordem_perguntas = session.get('ordem_perguntas', [])
    
    if id_pergunta >= len(ordem_perguntas):
        return redirect(url_for('resultado'))
        
    try:
        id_real_pergunta = ordem_perguntas[id_pergunta]
        questao_original = lista_de_perguntas[id_real_pergunta]

        opcoes_para_embaralhar = list(questao_original['opcoes'])
        random.shuffle(opcoes_para_embaralhar)

        # NOVO: Guardamos a ordem exata que será exibida na sessão
        session['ordem_respostas_atual'] = opcoes_para_embaralhar

        opcoes_formatadas = []
#        kahoot_defaults = [
#            {'cor': '#e74c3c', 'icone': 'A'},
#            {'cor': '#3498db', 'icone': 'B'},
#            {'cor': '#f1c40f', 'icone': 'C'},
#            {'cor': '#2ecc71', 'icone': 'D'}
#        ]
        kahoot_defaults = [
            {'cor': '#e67e22', 'icone': 'A'},  # laranja queimado
            {'cor': '#2980b9', 'icone': 'B'},  # azul escuro
            {'cor': '#f39c12', 'icone': 'C'},  # amarelo mostarda
            {'cor': '#8e44ad', 'icone': 'D'}   # roxo intenso
        ]

        for texto_opcao, default in zip(opcoes_para_embaralhar, kahoot_defaults):
            opcoes_formatadas.append({
                'texto': texto_opcao,
                'cor': default['cor'],
                'icone': default['icone']
            })
        
        return render_template('index.html', 
                               pergunta=questao_original['pergunta'],
                               opcoes=opcoes_formatadas,
                               id_pergunta=id_pergunta)
    except IndexError:
        return redirect(url_for('resultado'))

@app.route('/responder/<int:id_pergunta>', methods=['POST'])
def responder(id_pergunta):
    """ Processa a resposta do jogador e redireciona de acordo com o modo de jogo. """
    ordem_perguntas = session.get('ordem_perguntas', [])
    id_real_pergunta = ordem_perguntas[id_pergunta]
    resposta_correta = lista_de_perguntas[id_real_pergunta]['resposta']

    resposta_jogador = request.form['opcao']
    tempo_levado = int(request.form.get('tempo_levado', 30))

    pontos_ganhos = 0
    acertou = (resposta_jogador == resposta_correta)

    if acertou:
        session['acertos'] = session.get('acertos', 0) + 1
        tempo_total_bonus = 30
        if tempo_levado < tempo_total_bonus:
            tempo_restante = tempo_total_bonus - tempo_levado
            pontos_bonus = 500 * (tempo_restante / tempo_total_bonus)
            pontos_ganhos = 500 + int(pontos_bonus)
        else:
            pontos_ganhos = 100
    
    session['pontuacao'] = session.get('pontuacao', 0) + pontos_ganhos

    # AQUI ESTÁ A NOVA LÓGICA DE MODO DE JOGO
    modo_de_jogo = session.get('modo_de_jogo', 'classico')

    if modo_de_jogo == 'aprendizagem':
        # No modo aprendizagem, guardamos a escolha do jogador e vamos para a revisão
        session['ultima_resposta_jogador'] = resposta_jogador
        return redirect(url_for('revisao', id_pergunta=id_pergunta))
    else:
        # No modo clássico, vamos direto para a próxima pergunta
        proximo_id = id_pergunta + 1
        if proximo_id >= len(ordem_perguntas):
            return redirect(url_for('animacao'))
        else:
            return redirect(url_for('exibir_pergunta', id_pergunta=proximo_id))

@app.route('/resultado')
def resultado():
    """ Exibe a pontuação final e o número de acertos. """
    pontuacao = session.get('pontuacao', 0)
    total_perguntas = len(session.get('ordem_perguntas', []))
    acertos = session.get('acertos', 0) # Pega o número de acertos da sessão
    
    # Envia todas as informações para o template
    return render_template('resultado.html', 
                           pontuacao=pontuacao, 
                           total=total_perguntas, 
                           acertos=acertos)

@app.route('/salvar-pontuacao', methods=['POST'])
def salvar_pontuacao():
    """Pega o nick e a pontuação, salva no placar e redireciona com ambos os dados."""
    nick = request.form['nick']
    pontos = session.get('pontuacao', 0)

    placar_atual = carregar_placar()
    placar_atual.append({'nick': nick, 'pontos': pontos})
    salvar_placar(placar_atual)
    
    # ALTERAÇÃO: Agora passamos o nick E os pontos para a próxima página
    return redirect(url_for('exibir_placar', nick_recente=nick, pontos_recentes=pontos))

@app.route('/placar')
def exibir_placar():
    """Exibe a página com os recordes, recebendo dados para o destaque."""
    # ALTERAÇÃO: Pega ambos os parâmetros da URL
    nick_recente = request.args.get('nick_recente', None)
    # Convertemos os pontos para int, com um valor padrão que não deve existir (-1)
    pontos_recentes = int(request.args.get('pontos_recentes', -1))
    
    placar = carregar_placar()

    # ALTERAÇÃO: Envia todos os dados para o template
    return render_template('placar.html', 
                           placar=placar, 
                           nick_recente=nick_recente, 
                           pontos_recentes=pontos_recentes)


@app.route('/revisao/<int:id_pergunta>')
def revisao(id_pergunta):
    """ Mostra a tela de revisão da pergunta respondida. """
    ordem_perguntas = session.get('ordem_perguntas', [])
    id_real_pergunta = ordem_perguntas[id_pergunta]
    questao_original = lista_de_perguntas[id_real_pergunta]

    # ALTERAÇÃO: Usamos a ordem de respostas que foi guardada na sessão
    opcoes_mostradas = session.get('ordem_respostas_atual', [])
    
    dados_revisao = {
        'pergunta': questao_original['pergunta'],
        'opcoes_mostradas': opcoes_mostradas, # Passa a lista na ordem correta
        'resposta_correta': questao_original['resposta'],
        'resposta_jogador': session.get('ultima_resposta_jogador')
    }
    
    proximo_id = id_pergunta + 1
    
    return render_template('revisao.html', revisao=dados_revisao, proximo_id=proximo_id)

# --- FUNÇÕES AUXILIARES ---

def carregar_perguntas():
    """ Lê o arquivo de perguntas e o transforma em uma lista de dicionários. """
    perguntas = []
    with open('perguntas.txt', 'r', encoding='utf-8') as file:
    #-- with open('perguntas_infantil.txt', 'r', encoding='utf-8') as file:
        blocos_de_perguntas = file.read().strip().split('---')

    for bloco in blocos_de_perguntas:
        if not bloco.strip():
            continue

        linhas = [linha.strip() for linha in bloco.strip().split('\n') if linha.strip()]
        
        texto_pergunta = linhas[0]
        opcoes_raw = linhas[1:]
        
        resposta_correta = ""
        textos_das_opcoes = []
        for opcao in opcoes_raw:
            if opcao.startswith('*'):
                resposta_correta = opcao[1:]
                textos_das_opcoes.append(opcao[1:])
            else:
                textos_das_opcoes.append(opcao)
        
        perguntas.append({
            'pergunta': texto_pergunta,
            'opcoes': textos_das_opcoes,
            'resposta': resposta_correta
        })
    
    return perguntas

def carregar_placar():
    """Lê o placar do arquivo JSON. Se o arquivo não existir, retorna uma lista vazia."""
    try:
        with open('placar.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def salvar_placar(placar):
    """Salva o placar (uma lista de dicionários) no arquivo JSON."""
    placar_ordenado = sorted(placar, key=lambda x: x['pontos'], reverse=True)
    placar_top10 = placar_ordenado[:10]
    with open('placar.json', 'w', encoding='utf-8') as f:
        json.dump(placar_top10, f, ensure_ascii=False, indent=4)


# --- INICIALIZAÇÃO ---
# Carrega as perguntas do arquivo assim que a aplicação inicia
lista_de_perguntas = carregar_perguntas()