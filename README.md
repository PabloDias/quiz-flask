# 🏆 Quiz Interativo Personalizável

Bem-vindo ao Quiz Interativo! Um jogo dinâmico e divertido no estilo Kahoot, construído com Python e Flask, agora com múltiplos modos de jogo, temas e configurações.

## ✨ Funcionalidades Principais

O projeto evoluiu e agora conta com um conjunto robusto de funcionalidades:

* **Sistema de Acesso com Código:** A página inicial solicita um código que libera diferentes conjuntos de modos de jogo, permitindo uma experiência controlada.

* **Múltiplos Modos de Jogo:**
    * **Modo Clássico:** Uma experiência rápida e desafiadora com pontuação baseada em tempo, usando seu próprio arquivo de perguntas (`perguntas.txt`).
    * **Modo Aprendizagem:** Ideal para estudo, mostra a resposta correta e uma explicação após cada pergunta durante 5 segundos. Usa um arquivo de perguntas separado (`perguntas_infantil.txt`).
    * **Modo Piscicultura:** Um modo temático que funciona como o Modo Aprendizagem, mas com seu próprio questionário (`perguntas_piscicultura.txt`) e GIFs personalizados.

* **Configuração de Partida:** Uma página de configurações dedicada permite ao administrador definir o número de perguntas por rodada, com a configuração sendo salva em um arquivo `config.json`.

* **Placares de Recordes Separados:** Cada modo de jogo tem seu próprio placar de recordes, salvos em arquivos `.json` distintos (`placar_classico.json`, etc.), com destaque automático para a pontuação do jogador atual.

* **Interatividade Avançada:**
    * **Pontuação Dinâmica:** A pontuação é calculada com base na velocidade da resposta correta.
    * **Controle via Teclado/Airmouse:** As respostas podem ser selecionadas usando as setas do teclado.
    * **GIFs Temáticos:** A interface se adapta visualmente ao modo de jogo, exibindo GIFs diferentes e alternados.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Python 3, Flask, Flask-Session
* **Frontend:** HTML5, CSS3, JavaScript
* **Armazenamento de Dados:** Arquivos de texto e JSON para perguntas, placares e configurações.

## 🚀 Como Executar o Projeto

Para executar este projeto em sua máquina local, siga os passos abaixo.

### Pré-requisitos
* Python 3.8 ou superior
* Git (para clonar o repositório)

### Passos para Instalação

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git](https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git)
    cd SEU_REPOSITORIO
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
    ```bash
    pip install -r requirements.txt
    ```

4.  **Prepare os arquivos de dados e imagens:**
    * Certifique-se de que os arquivos `perguntas.txt`, `perguntas_infantil.txt` e `perguntas_piscicultura.txt` estão na raiz do projeto.
    * Adicione as imagens e GIFs necessários na pasta `static/img/`.

5.  **Execute a aplicação:**
    ```bash
    flask --app app run
    ```
    Acesse `http://127.0.0.1:5000` no seu navegador para começar.

## 📝 Estrutura dos Arquivos de Perguntas

Para adicionar suas próprias perguntas, edite os arquivos `.txt`. A resposta correta deve ser marcada com um asterisco `*`. Para os modos que usam revisão, adicione a linha de explicação com o prefixo `explicacao:`.

**Exemplo com explicação:**
```
Qual é o pH ideal para a criação de tilápias?
explicacao: O pH ideal para a tilápia do Nilo fica entre 7,0 e 8,0.
Opção A
*Opção B
Opção C
Opção D
---
```

## 👨‍💻 Desenvolvedor

* [Pablo Dias]