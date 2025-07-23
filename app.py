from flask import Flask, render_template, request, redirect, url_for, session
from flask_session import Session
import random
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sua-chave-secreta-muito-dificil'
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem" # <--- DIZ AO FLASK PARA GUARDAR A SESSÃO EM ARQUIVOS NO SERVIDOR
Session(app) # <--- INICIALIZA A EXTENSÃO COM O NOSSO APP

# --- NOVAS FUNÇÕES DE CONFIGURAÇÃO ---
def carregar_config():
    """Carrega as configurações do arquivo config.json."""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Retorna um padrão se o arquivo não existir ou for inválido
        return {'perguntas_por_partida': 5}

def salvar_config(config):
    """Salva as configurações no arquivo config.json."""
    with open('config.json', 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=4)

# --- ROTAS DA APLICAÇÃO ---

@app.route('/')
def home():
    """Renderiza a página inicial do quiz."""
    return render_template('home.html')

@app.route('/configuracao', methods=['GET'])
def configuracao():
    """Exibe a página de configuração do jogo."""
    config = carregar_config()
    return render_template('configuracao.html', config=config)

@app.route('/salvar-configuracao', methods=['POST'])
def salvar_configuracao():
    """Salva a nova configuração de número de perguntas."""
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
    """Prepara a sessão e redireciona para a primeira pergunta do quiz."""
    config = carregar_config()
    num_perguntas = config.get('perguntas_por_partida', 5)
    
    # Define qual arquivo de perguntas carregar com base no modo
    arquivos_quiz = {
        'classico': 'perguntas.txt',
        'aprendizagem': 'perguntas_infantil.txt'
    }
    arquivo_selecionado = arquivos_quiz.get(modo_de_jogo, 'perguntas.txt')
    lista_de_perguntas_completa = carregar_perguntas(arquivo_selecionado)
    
    if not lista_de_perguntas_completa:
        return redirect(url_for('home')) # Volta para home se o arquivo de perguntas estiver vazio/não existir

    session['lista_de_perguntas'] = lista_de_perguntas_completa
    session['modo_de_jogo'] = modo_de_jogo
    
    indices_disponiveis = list(range(len(lista_de_perguntas_completa)))
    num_a_sortear = min(num_perguntas, len(indices_disponiveis))
    indices_sorteados = random.sample(indices_disponiveis, num_a_sortear)

    session['ordem_perguntas'] = indices_sorteados
    session['pontuacao'] = 0
    session['acertos'] = 0
    
    return redirect(url_for('exibir_pergunta', id_pergunta=0))

@app.route('/animacao')
def animacao():
    """Mostra a página de animação antes do resultado."""
    return render_template('animacao.html')

@app.route('/resultado')
def resultado():
    pontuacao = session.get('pontuacao', 0)
    total_perguntas = len(session.get('ordem_perguntas', []))
    acertos = session.get('acertos', 0)
    return render_template('resultado.html', pontuacao=pontuacao, total=total_perguntas, acertos=acertos)

@app.route('/salvar-pontuacao', methods=['POST'])
def salvar_pontuacao():
    nick = request.form['nick']
    pontos = session.get('pontuacao', 0)
    modo = session.get('modo_de_jogo', 'classico') # Pega o modo da sessão

    placar_atual = carregar_placar(modo) # Carrega o placar do modo correto
    placar_atual.append({'nick': nick, 'pontos': pontos})
    salvar_placar(placar_atual, modo) # Salva no placar do modo correto
    
    # Redireciona para a exibição do placar do modo correto
    return redirect(url_for('exibir_placar', modo=modo, nick_recente=nick, pontos_recentes=pontos))

@app.route('/placar/<modo>')
def exibir_placar(modo):
    nick_recente = request.args.get('nick_recente', None)
    pontos_recentes = int(request.args.get('pontos_recentes', -1))
    
    placar = carregar_placar(modo) # Carrega o placar do modo correto
    return render_template('placar.html', placar=placar, modo=modo, nick_recente=nick_recente, pontos_recentes=pontos_recentes)

# --- FUNÇÕES AUXILIARES ATUALIZADAS ---

def carregar_perguntas(nome_arquivo):
    """ Lê um arquivo de perguntas específico e o transforma em uma lista de dicionários. """
    perguntas = []
    try:
        # A variável foi aberta como 'f'
        with open(nome_arquivo, 'r', encoding='utf-8') as f:
            # CORREÇÃO: Usamos 'f.read()' em vez de 'file.read()'
            blocos_de_perguntas = f.read().strip().split('---')

            for bloco in blocos_de_perguntas:
                if not bloco.strip():
                    continue
                linhas = [linha.strip() for linha in bloco.strip().split('\n') if linha.strip()]
                
                # Previne erro se o bloco estiver mal formatado
                if len(linhas) < 2:
                    continue
                    
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
                
                # Garante que uma resposta correta foi encontrada
                if not resposta_correta:
                    continue

                perguntas.append({
                    'pergunta': texto_pergunta,
                    'opcoes': textos_das_opcoes,
                    'resposta': resposta_correta
                })
    except FileNotFoundError:
        print(f"AVISO: O arquivo '{nome_arquivo}' não foi encontrado.")
        return []
    
    return perguntas

def carregar_placar(modo):
    """Lê o placar do arquivo JSON para um modo específico."""
    nome_arquivo = f"placar_{modo}.json"
    try:
        with open(nome_arquivo, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def salvar_placar(placar, modo):
    """Salva o placar no arquivo JSON de um modo específico."""
    nome_arquivo = f"placar_{modo}.json"
    placar_ordenado = sorted(placar, key=lambda x: x['pontos'], reverse=True)
    placar_top10 = placar_ordenado[:10]
    with open(nome_arquivo, 'w', encoding='utf-8') as f:
        json.dump(placar_top10, f, ensure_ascii=False, indent=4)

# As outras funções (/quiz, /responder, /animacao, /revisao) não precisam de mudanças no seu código interno,
# apenas nas chamadas ao placar, que já corrigimos acima.

# Para garantir, aqui estão as versões completas de exibir_pergunta e responder que leem da sessão.
@app.route('/quiz/<int:id_pergunta>')
def exibir_pergunta(id_pergunta):
    lista_de_perguntas = session.get('lista_de_perguntas', [])
    ordem_perguntas = session.get('ordem_perguntas', [])
    if id_pergunta >= len(ordem_perguntas): return redirect(url_for('resultado'))
    try:
        id_real_pergunta = ordem_perguntas[id_pergunta]
        questao_original = lista_de_perguntas[id_real_pergunta]
        opcoes_para_embaralhar = list(questao_original['opcoes'])
        random.shuffle(opcoes_para_embaralhar)
        session['ordem_respostas_atual'] = opcoes_para_embaralhar
        opcoes_formatadas = []
        kahoot_defaults = [{'cor': '#e74c3c', 'icone': 'A'}, {'cor': '#3498db', 'icone': 'B'}, {'cor': '#f1c40f', 'icone': 'C'}, {'cor': '#2ecc71', 'icone': 'D'}]
        for texto_opcao, default in zip(opcoes_para_embaralhar, kahoot_defaults):
            opcoes_formatadas.append({'texto': texto_opcao, 'cor': default['cor'], 'icone': default['icone']})
        return render_template('index.html', pergunta=questao_original['pergunta'], opcoes=opcoes_formatadas, id_pergunta=id_pergunta)
    except IndexError:
        return redirect(url_for('resultado'))

@app.route('/responder/<int:id_pergunta>', methods=['POST'])
def responder(id_pergunta):
    lista_de_perguntas = session.get('lista_de_perguntas', [])
    ordem_perguntas = session.get('ordem_perguntas', [])
    id_real_pergunta = ordem_perguntas[id_pergunta]
    resposta_correta = lista_de_perguntas[id_real_pergunta]['resposta']
    resposta_jogador = request.form['opcao']
    tempo_levado = int(request.form.get('tempo_levado', 30))
    pontos_ganhos = 0
    if resposta_jogador == resposta_correta:
        session['acertos'] = session.get('acertos', 0) + 1
        if tempo_levado < 30:
            pontos_ganhos = 500 + int(500 * ((30 - tempo_levado) / 30))
        else:
            pontos_ganhos = 100
    session['pontuacao'] = session.get('pontuacao', 0) + pontos_ganhos
    modo_de_jogo = session.get('modo_de_jogo', 'classico')
    if modo_de_jogo == 'aprendizagem':
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
    ordem_perguntas = session.get('ordem_perguntas', [])
    id_real_pergunta = ordem_perguntas[id_pergunta]
    lista_de_perguntas = session.get('lista_de_perguntas', [])
    questao_original = lista_de_perguntas[id_real_pergunta]
    opcoes_mostradas = session.get('ordem_respostas_atual', [])
    dados_revisao = {'pergunta': questao_original['pergunta'], 'opcoes_mostradas': opcoes_mostradas, 'resposta_correta': questao_original['resposta'], 'resposta_jogador': session.get('ultima_resposta_jogador')}
    proximo_id = id_pergunta + 1
    return render_template('revisao.html', revisao=dados_revisao, proximo_id=proximo_id)
