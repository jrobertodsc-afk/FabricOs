# Manual de Instalação e Operação Comercial: FabricOS Enterprise

Este manual instrui a instalação, o primeiro setup e a liberação de rede local para a distribuição **zero-dependência** do FabricOS Enterprise na infraestrutura local do cliente.

---

## 🚀 1. Primeiro Setup (Instalação Rápida)

Como o FabricOS foi compilado de forma nativa e auto-hospedada, **não é necessário** instalar Python, Node.js, Git, Docker ou qualquer banco de dados externo. O sistema roda inteiramente em código de máquina nativo de forma isolada!

1.  **Extração do Pacote:**
    Copie a pasta `FabricOS-Enterprise` para o diretório de sua preferência no servidor ou computador local (ex: `C:\FabricOS`).
2.  **Inicialização:**
    Dê dois cliques no executável **`fabricos_server.exe`** ou no launcher **`Iniciar_Producao.bat`**.
3.  **Acesso Visual:**
    O navegador de internet abrirá automaticamente no endereço:
    👉 **`http://127.0.0.1:8000`** (ou `http://localhost:8000`)

O executável inicializará o banco de dados `fabricos.db` no mesmo diretório e hospedará tanto as APIs quanto a interface gráfica inteira de forma integrada.

---

## 🔑 2. Ativação da Licença Comercial

Ao iniciar o sistema pela primeira vez, se o banco for novo ou se a licença antiga expirar, o sistema apresentará a tela vermelha de bloqueio: **"Instância Suspensa - FabricOS"**.

Para ativar:
1.  Copie o **Token de Licença JWS** assinado criptograficamente fornecido pela nossa equipe comercial.
2.  Acesse a rota administrativa **`/backoffice`** (`http://127.0.0.1:8000/backoffice`) no navegador.
3.  Cadastre a chave de licença correspondente para a sua filial. O sistema decodificará a assinatura criptográfica e liberará imediatamente os módulos contratados (Produção, Logística ou Mobile).

---

## 📱 3. Acesso pelo Celular/Tablet no Chão de Fábrica

Para que os operadores de costura, conferencistas, estoquistas e motoboys acessem as telas do sistema pelo celular ou tablet na mesma rede Wi-Fi da empresa:

### Passo A: Descobrir o IP do Servidor
No computador onde o `fabricos_server.exe` está rodando:
1.  Abra o menu iniciar do Windows, digite `cmd` e dê Enter.
2.  No terminal, digite o comando: `ipconfig` e aperte Enter.
3.  Procure pela linha **"Endereço IPv4"** (ex: `192.168.1.150`). Este é o IP do servidor local na rede da sua empresa.

### Passo B: Liberar a Porta no Firewall do Windows
Para permitir que outros aparelhos se conectem ao servidor local:
1.  Abra o painel de **Firewall do Windows com Segurança Avançada** (digite `wf.msc` no iniciar).
2.  Clique em **"Regras de Entrada"** no menu esquerdo, e depois em **"Nova Regra..."** no menu direito.
3.  Selecione **"Porta"** e avance.
4.  Selecione **"TCP"** e, em "Portas locais específicas", digite: `8000` e avance.
5.  Selecione **"Permitir a conexão"** e avance.
6.  Marque todas as opções (Domínio, Privado, Público) e dê o nome: `FabricOS Local Server`. Clique em Concluir.

### Passo C: Conectar pelo Smartphone/Tablet
1.  Certifique-se de que o smartphone/tablet está conectado na **mesma rede Wi-Fi** do servidor.
2.  Abra o navegador do celular (Chrome ou Safari) e acesse o IP do servidor na porta 8000:
    👉 **`http://<IP_DO_SERVIDOR>:8000/mobile`** (ex: `http://192.168.1.150:8000/mobile`)
3.  O sistema setorial móvel carregará perfeitamente com bipe de volumes por câmera e controle de reparto em tempo real!

---

## 💾 4. Backups de Segurança

Todos os dados do seu sistema de produção, faturamento, RFID e frotas são salvos exclusivamente no arquivo **`fabricos.db`** localizado na pasta do sistema.
*   **Como fazer backup:** Basta copiar o arquivo `fabricos.db` para um pendrive, HD externo ou nuvem (Google Drive/Dropbox) diariamente.
*   **Como restaurar:** Em caso de pane na máquina, instale a pasta FabricOS em um novo computador e substitua o arquivo `fabricos.db` em branco pelo seu arquivo de backup. Todo o seu histórico e configurações serão reestabelecidos instantaneamente!
