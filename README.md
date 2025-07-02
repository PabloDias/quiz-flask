# 🏆 Quiz Interativo 

Bem-vindo ao Quiz Interativo! Um jogo dinâmico e divertido no estilo Kahoot, construído com Python e Flask. Este projeto foi desenvolvido para testar seus conhecimentos de forma rápida e emocionante.

## ✨ Funcionalidades

O projeto conta com um conjunto robusto de funcionalidades, incluindo:

* **Dois Modos de Jogo:**
    * **Modo Clássico:** Responda 5 perguntas aleatórias com foco total na velocidade e pontuação.
    * **Modo Aprendizagem:** Revise a resposta correta por 5 segundos após cada pergunta antes de prosseguir.
* **Sistema de Pontuação Dinâmico:** A pontuação é baseada no tempo de resposta. Quanto mais rápido você acertar, mais pontos ganha!
* **Perguntas e Respostas Aleatórias:** A ordem das perguntas e das respostas é embaralhada a cada nova partida, garantindo uma experiência única sempre.
* **Placar de Recordes:** Salve sua pontuação com um nick e veja o ranking dos 10 melhores jogadores. Sua pontuação é destacada automaticamente após o jogo.
* **Interface Moderna:** Design responsivo e interativo, com uma página inicial, tela de jogo, animações e tela de resultados.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Python 3, Flask
* **Frontend:** HTML5, CSS3, JavaScript
* **Banco de Dados (Simples):** Arquivos de texto para perguntas (`perguntas.txt`) e placar (`placar.json`).

## 🚀 Como Executar o Projeto

Para executar este projeto em sua máquina local, siga os passos abaixo.

### Pré-requisitos
* Python 3.8 ou superior
* Git (para clonar o repositório)

### Passos para Instalação

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/PabloDias/quiz-flask.git]
    ```

2.  **Crie e ative um ambiente virtual:**
    ```bash
    # Criar o ambiente
    python -m venv venv

    # Ativar no Windows
    .\venv\Scripts\activate

    # Ativar no macOS/Linux
    source venv/bin/activate
    ```

3.  **Instale as dependências:**
    O arquivo `requirements.txt` contém as bibliotecas necessárias.
    ```bash
    pip install -r requirements.txt
    ```

4.  **Prepare os arquivos de dados:**
    * Certifique-se que o arquivo `perguntas.txt` está na raiz do projeto.
    * Adicione as imagens necessárias (`devs.jpg`, `fund.png`, `vaquinha.gif`, etc.) na pasta `static/img/`.

5.  **Execute a aplicação:**
    ```bash
    flask --app app run
    ```
    Acesse `http://127.0.0.1:5000` no seu navegador para começar a jogar!

## 📝 Estrutura do `perguntas.txt`

Para adicionar suas próprias perguntas, edite o arquivo `perguntas.txt` seguindo o formato abaixo. A resposta correta deve ser marcada com um asterisco `*` no início. Separe cada bloco de pergunta com `---`.

```
Qual é a capital do Brasil?
Rio de Janeiro
*Brasília
São Paulo
Belo Horizonte
---
Qual o resultado de 2 + 2?
3
*4
5
6
---
```

## 👨‍💻 Desenvolvedor

* PABLO TENORIO DIAS
