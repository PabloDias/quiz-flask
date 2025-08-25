# 🏆 Quiz Interativo Personalizável v2.0

Bem-vindo ao Quiz Interativo! Um jogo dinâmico e divertido no estilo Kahoot, construído com Python e Flask. Esta versão do projeto utiliza uma arquitetura avançada onde todos os recursos visuais e de dados (imagens, templates, perguntas) são empacotados, protegendo-os de edição casual.

## ✨ Funcionalidades Principais

* **Sistema de Acesso com Código:** A página inicial solicita um código que libera diferentes conjuntos de modos de jogo.
* **Múltiplos Modos de Jogo Temáticos:**
    * **Modo Clássico:** Experiência rápida com pontuação baseada em tempo.
    * **Modo Aprendizagem:** Mostra a resposta correta e uma explicação após cada pergunta.
    * **Modo Piscicultura:** Um modo temático com seu próprio questionário, GIFs e fluxo de aprendizagem.
* **Configuração de Partida:** Uma página de configurações dedicada permite definir o número de perguntas por rodada.
* **Placares de Recordes Separados:** Cada modo de jogo possui seu próprio ranking dos 10 melhores.
* **Recursos Protegidos:** Todos os assets (imagens, templates, arquivos de perguntas) são agrupados em um arquivo `assets.zip`, que é descompactado em um diretório temporário durante a execução, evitando que os arquivos fiquem expostos na pasta do jogo.
* **Interatividade Avançada:** Pontuação dinâmica por tempo, controle via teclado/airmouse e GIFs temáticos.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Python 3, Flask, Flask-Session
* **Frontend:** HTML5, CSS3, JavaScript
* **Empacotamento:** PyInstaller
* **Bibliotecas Padrão (Python):** `zipfile`, `tempfile`, `shutil`, `atexit` para gerenciamento de assets.

## 🚀 Como Executar o Projeto

Existem duas maneiras de rodar este projeto: em modo de desenvolvimento (para fazer alterações) e preparando a versão final para distribuição.

### 1. Rodando em Modo de Desenvolvimento

Neste modo, o aplicativo lê os arquivos diretamente das pastas (`templates`, `static`, etc.), facilitando a edição.

1.  **Clone o repositório e prepare o ambiente:**
    ```bash
    git clone [https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git](https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git)
    cd SEU_REPOSITORIO
    python -m venv venv
    # Ative o venv (.\venv\Scripts\activate no Windows ou source venv/bin/activate no Mac/Linux)
    pip install -r requirements.txt
    ```
2.  **Execute a aplicação:**
    ```bash
    flask --app app run
    ```
    O aplicativo irá funcionar normalmente, lendo os arquivos "soltos" do projeto.

### 2. Gerando a Versão Distribuível (`.exe`)

Este processo cria a versão final que pode ser compartilhada.

1.  **Crie o arquivo `assets.zip`:** Este é um passo manual crucial. Na pasta do projeto, selecione as seguintes pastas e arquivos:
    * `templates`
    * `static`
    * `perguntas.txt`
    * `perguntas_infantil.txt`
    * `perguntas_piscicultura.txt`
    * `config.json` (se existir)
    
    Clique com o botão direito, escolha "Enviar para" > "Pasta compactada (zipada)" e renomeie o arquivo para **`assets.zip`**.

2.  **Execute o PyInstaller:** No terminal, com o ambiente `venv` ativo, rode o comando para criar a versão em pasta (mais confiável contra antivírus):
    ```bash
    pyinstaller --name="QuizAgro" --windowed --add-data="assets.zip;." run.py
    ```
    *(Lembre-se de usar `;` para o `--add-data` no Windows e `:` no Mac/Linux)*

A pasta final, pronta para ser compartilhada (em um `.zip`), estará em `dist/QuizAgro`.

## 📝 Estrutura dos Arquivos de Perguntas

Para adicionar suas próprias perguntas, edite os arquivos `.txt`. A resposta correta deve ser marcada com um asterisco `*`. Para os modos que usam revisão, adicione a linha de explicação com o prefixo `explicacao:`.

```
Qual é o pH ideal para a criação de tilápias?
explicacao: O pH ideal para a tilápia do Nilo fica entre 7,0 e 8,0.
*Opção A
Opção B
...
---
```

## 👨‍💻 Desenvolvedor

* [Pablo Dias]
