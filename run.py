import webbrowser
from threading import Timer
from app import app

#Chamar o navegador
def abrir_navegador():
    webbrowser.open_new("http://127.0.0.1:5000")

if __name__ == '__main__':
    #Temporizador para abrir navegador
    Timer(1, abrir_navegador).start()
    #Inicia o servidor
    app.run(host='127.0.0.1', port=5000)

