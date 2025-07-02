# Adicionamos 'session', 'redirect', 'url_for' e 'request' do Flask
from flask import Flask, render_template, request, redirect, url_for, session
import json
import random

app = Flask(__name__)
# É NECESSÁRIO definir uma 'chave secreta' para a sessão funcionar
app.config['SECRET_KEY'] = 'sua-chave-secreta-muito-dificil'


def carregar_perguntas():
    """
    Lê o arquivo de perguntas e o transforma em uma lista de dicionários.
    Nesta versão, as opções NÃO são embaralhadas no carregamento.
    """
    perguntas = []
    with open('perguntas.txt', 'r', encoding='utf-8') as file:
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
            'opcoes': textos_das_opcoes,  # Salva apenas a lista de textos das opções
            'resposta': resposta_correta
        })
    
    return perguntas

lista_de_perguntas = carregar_perguntas()


@app.route('/')
def pagina_inicial():
    """ Rota inicial que prepara o jogo. """
    # ALTERAÇÃO: Embaralha a ordem das perguntas para um novo jogo.
    total_perguntas = len(lista_de_perguntas)
    ordem_sorteada = list(range(total_perguntas)) # Cria uma lista [0, 1, 2, ...]
    random.shuffle(ordem_sorteada) # Embaralha a lista para ex: [2, 0, 1, ...]
    
    session['ordem_perguntas'] = ordem_sorteada # Salva a ordem na sessão
    session['pontuacao'] = 0
    session['pergunta_atual_id'] = 0 # Este agora é o índice da 'rodada' (0, 1, 2...)
    
    return redirect(url_for('exibir_pergunta', id_pergunta=0))



@app.route('/responder/<int:id_pergunta>', methods=['POST'])
def responder(id_pergunta):
    """ Processa a resposta do jogador para a rodada atual. """
    # ALTERAÇÃO: Pega o ID real da pergunta para verificar a resposta correta.
    ordem_perguntas = session.get('ordem_perguntas', [])
    id_real_pergunta = ordem_perguntas[id_pergunta]

    resposta_jogador = request.form['opcao']
    resposta_correta = lista_de_perguntas[id_real_pergunta]['resposta']

    if resposta_jogador == resposta_correta:
        session['pontuacao'] += 1
    
    # Avança para a próxima rodada
    proximo_id = id_pergunta + 1
    return redirect(url_for('exibir_pergunta', id_pergunta=proximo_id))


@app.route('/resultado')
def resultado():
    """ Exibe a pontuação final. """
    pontuacao = session.get('pontuacao', 0)
    total_perguntas = len(lista_de_perguntas)
    return render_template('resultado.html', pontuacao=pontuacao, total=total_perguntas)

def carregar_placar():
    """Lê o placar do arquivo JSON. Se o arquivo não existir, retorna uma lista vazia."""
    try:
        with open('placar.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def salvar_placar(placar):
    """Salva o placar (uma lista de dicionários) no arquivo JSON."""
    # Ordena o placar pela pontuação, do maior para o menor
    placar_ordenado = sorted(placar, key=lambda x: x['pontos'], reverse=True)
    # Mantém apenas os 10 melhores
    placar_top10 = placar_ordenado[:10]
    with open('placar.json', 'w', encoding='utf-8') as f:
        # ensure_ascii=False para salvar acentos corretamente
        json.dump(placar_top10, f, ensure_ascii=False, indent=4)

@app.route('/salvar-pontuacao', methods=['POST'])
def salvar_pontuacao():
    """Pega o nick e a pontuação, salva no placar e redireciona."""
    nick = request.form['nick']
    pontos = session.get('pontuacao', 0)

    # Carrega o placar atual, adiciona o novo resultado e salva
    placar_atual = carregar_placar()
    placar_atual.append({'nick': nick, 'pontos': pontos})
    salvar_placar(placar_atual)
    
    # Redireciona para a página do placar
    return redirect(url_for('exibir_placar'))

@app.route('/placar')
def exibir_placar():
    """Exibe a página com os recordes."""
    placar = carregar_placar()
    return render_template('placar.html', placar=placar)

@app.route('/quiz/<int:id_pergunta>')
def exibir_pergunta(id_pergunta):
    """ Exibe a pergunta, embaralhando suas opções em tempo real. """
    ordem_perguntas = session.get('ordem_perguntas', [])
    
    if id_pergunta >= len(ordem_perguntas):
        return redirect(url_for('resultado'))
        
    try:
        id_real_pergunta = ordem_perguntas[id_pergunta]
        questao_original = lista_de_perguntas[id_real_pergunta]

        # --- NOVA LÓGICA DE EMBARALHAMENTO EM TEMPO REAL ---
        # Copia a lista de textos de opção para não alterar a original
        opcoes_para_embaralhar = list(questao_original['opcoes'])
        random.shuffle(opcoes_para_embaralhar)

        # Prepara as opções formatadas (com cores e letras) no momento da exibição
        opcoes_formatadas = []
        kahoot_defaults = [
            {'cor': '#e74c3c', 'icone': 'A'},
            {'cor': '#3498db', 'icone': 'B'},
            {'cor': '#f1c40f', 'icone': 'C'},
            {'cor': '#2ecc71', 'icone': 'D'}
        ]
        for texto_opcao, default in zip(opcoes_para_embaralhar, kahoot_defaults):
            opcoes_formatadas.append({
                'texto': texto_opcao,
                'cor': default['cor'],
                'icone': default['icone']
            })
        
        # Passamos os dados para o template de forma separada
        return render_template('index.html', 
                               pergunta=questao_original['pergunta'],
                               opcoes=opcoes_formatadas, # Passa as opções recém-embaralhadas
                               id_pergunta=id_pergunta)
    except IndexError:
        return redirect(url_for('resultado'))