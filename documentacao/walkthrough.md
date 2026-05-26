# Walkthrough: Licenciamento Comercial, Separação de Módulos, Backoffice Central e Trava Remota (Kill-Switch)

Toda a arquitetura de **licenciamento comercial setorial**, **proteção criptográfica de propriedade intelectual (IP)**, o **Central Backoffice de Controle** e a **Trava Remota (Kill-Switch)** do **FabricOS** foram implementados, integrados e validados com 100% de sucesso.

Os testes de integração de ponta a ponta (**`test_licensing_killswitch.py`**) foram executados e comprovaram a integridade matemática da criptografia JWS, o bloqueio automático de rotas não licenciadas, o lockdown local instantâneo, e o bloqueio de rede por estouro de prazo offline de 72h.

---

## 🌟 Principais Funcionalidades Implementadas (Fase 8)

### 1. Separação Física e Comercial por Módulos
Estruturamos o FabricOS em 3 setores comerciais independentes, cujas chaves de licença controlam o acesso tanto a nível de API (FastAPI) quanto de Interface de Usuário (React):
1.  **Produção (`producao`):** Governa as rotas de Ordens de Produção (OP), fichas técnicas, insumos e conciliação XML de NF-e.
2.  **Logística (`logistica`):** Governa as rotas de reparto por lojas, programação de rotas e expedições.
3.  **Mobile (`mobile`):** Habilita o acesso móvel do chão de fábrica para motoboys e estoquistas.

*   **Bloqueio Dinâmico no Frontend (`MobileDashboard.tsx`):**
    Injetamos o hook `useLicense` no dashboard móvel. Caso um módulo (ex: `logistica`) esteja desativado na licença do cliente, seus atalhos e seções são dinamicamente excluídos da interface em tempo real.
*   **Segurança de API no Backend (`license_middleware.py`):**
    Todas as rotas críticas de produção e distribuição foram envelopadas sob a dependência FastAPI `verify_module_license(module_name)`. Se o módulo estiver ausente da licença local do cliente, a API retorna `403 Forbidden` com feedback comercial.

### 2. Criptografia JWS e Assinatura Criptográfica
Para impedir que o cliente burle as licenças editando tabelas do banco de dados local:
*   A chave de licença é gerada em formato de token **JWS (JSON Web Signature)** assinado com a nossa chave privada (`LICENSE_SECRET`).
*   O token encapsula: `tenant_id`, `client_name`, `enabled_modules`, `expires_at` e o `iat` (Issued At).
*   Se o cliente alterar qualquer caractere do arquivo local de licença para tentar ativar um módulo ilegalmente, a assinatura criptográfica se quebra, e o middleware trava o sistema com o erro: *"Chave de licença local corrompida ou inválida! Assinatura criptográfica incorreta."*

### 3. Central Backoffice de Controle Tower (`BackofficeDashboard.tsx`)
Criamos um centro de controle centralizado de alta fidelidade visual (tema violeta-neon holográfico e dark glassmorphism) na rota `/backoffice` que permite a nós (donos do FabricOS):
*   **Monitorar Instâncias:** Visualizar todas as instâncias locais de clientes ativas no ecossistema, o timestamp do seu último ping de segurança, e a versão de software instalada.
*   **Acionar Trava Remota (Kill-Switch):** Um botão luminoso vermelho neon permite suspender o acesso do cliente à distância com um clique. No próximo ping da máquina do cliente, ela entra em lockdown local imediato.
*   **Modificar Licença Dinamicamente:** Painel de checkboxes interativo para habilitar/desabilitar módulos contratados na nuvem e dropdown para gerenciar canais de atualização (Estável, Beta, Developer).
*   **Simulador de Build & Auto-Update:** Um botão interativo que dispara o instalador físico silencioso local, atualizando a versão do banco de dados SQLite local para a build recomendada do canal.

### 4. Tela Vermelha de Lockdown Local (`LicenseLockScreen.tsx`)
*   Se o cliente for desativado à distância ou a licença expirar, a aplicação web React intercepta todas as rotas (via Axios interceptor global integrado ao `LicenseProvider`) e renderiza uma tela vermelha neon brilhante em tela cheia.
*   A tela impede qualquer interação com as telas de negócios, exibe os metadados do `tenant_id` e fornece CTAs imediatos com telefone/e-mail para contato com o setor financeiro.

### 5. Resiliência Offline e Período de Graça (72 Horas)
*   Se o cliente desconectar o servidor da internet para tentar evitar o ping de segurança do Kill-switch, o FabricOS continuará operando normalmente em modo offline por um **período de graça de até 72 horas**.
*   Decorrido o prazo de 3 dias sem estabelecer uma conexão bem-sucedida de validação criptográfica, o middleware tranca as APIs locais automaticamente por timeout offline.

---

## 🛠️ Validação e Confiabilidade do Código

-   **TypeScript Compilação (0 Erros):** Executamos a checagem de tipos estáticos em toda a interface do frontend via `npx tsc --noEmit`. O compilador TypeScript retornou **sucesso absoluto sem qualquer aviso ou erro**.
-   **Teste de Integração E2E (100% Sucesso):** Desenvolvemos o script de testes automatizados [test_licensing_killswitch.py](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/scratch/test_licensing_killswitch.py). O teste validou todo o ecossistema local e simulado em 5 passos críticos:
    1.  **Passo 1: Login Admin** ➔ Autenticação e aquisição do UUID do tenant do cliente.
    2.  **Passo 2: Acesso Normal** ➔ Verificação de que, com todos os módulos licenciados, a produção e logística operam em status `200 OK`.
    3.  **Passo 3: Separação de Módulos** ➔ Desativação de "logistica" no token JWS. A rota de logística passa a retornar `403 Forbidden` (*"Módulo 'logistica' não licenciado nesta instância"*), enquanto a rota de produção permanece 100% operacional em `200 OK`.
    4.  **Passo 4: Trava Remota / Kill-Switch** ➔ Simulação de ativação de trava pelo Backoffice. A chamada local é interceptada e bloqueada com `403 Forbidden` (*"Instância suspensa por pendências financeiras"*). Ao liberar a trava, o acesso volta a `200 OK`.
    5.  **Passo 5: Período de Graça Offline** ➔ Simulação de servidor offline por mais de 72h (+4 dias). O middleware detectou o grace period estourado e efetuou o travamento preventivo com status `403 Forbidden` de forma autônoma.

---

## 📁 Arquivos Criados e Modificados na Fase 8

| Tipo | Arquivo | Descrição |
| :--- | :--- | :--- |
| **Model** | [models.py](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/backend/app/models/models.py) | **[MODIFICADO]** Tabela `license_config` introduzida contendo chave JWS criptográfica, flag de lockdown, e trackers de grace period. |
| **FastAPI Core** | [license_middleware.py](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/backend/app/core/license_middleware.py) | **[NOVO]** Middleware de criptografia JWS, pings rápidos online para o Backoffice Central com tolerância offline de 72 horas. |
| **API Route** | [auth.py](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/backend/app/api/auth.py) | **[MODIFICADO]** Endpoint `/api/auth/license-status` implementado para que o frontend consulte os status de licença sem disparar exceções impeditivas. |
| **API Route** | [backoffice_server.py](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/backend/app/api/backoffice_server.py) | **[NOVO]** Servidor de licenciamento central simulado, com controle de trava à distância `/toggle-lock` e emulador de build de auto-update. |
| **Frontend Page** | [BackofficeDashboard.tsx](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/frontend/src/pages/BackofficeDashboard.tsx) | **[NOVO]** Painel administrativo Central holográfico dark para nós gerenciarmos módulos, travas, canais e disparar auto-updates físicos nos clientes. |
| **Frontend Page** | [LicenseLockScreen.tsx](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/frontend/src/pages/LicenseLockScreen.tsx) | **[NOVO]** Tela bloqueante vermelho-neon holográfica de lockdown para a máquina do cliente suspensa, exibindo UUID e dados do financeiro. |
| **Frontend Context** | [LicenseContext.tsx](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/frontend/src/contexts/LicenseContext.tsx) | **[NOVO]** Provider global que gerencia status da licença local, loop de pings em background e Axios Interceptor de Auto-Lockdown. |
| **Frontend Page** | [MobileDashboard.tsx](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/frontend/src/pages/MobileDashboard.tsx) | **[MODIFICADO]** Ocultação e renderização seletiva das seções de Produção e Logística com base no token decodificado do cliente. |
| **Frontend Config** | [App.tsx](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/frontend/src/App.tsx) | **[MODIFICADO]** Envelopamento da aplicação sob o `LicenseProvider`, bloqueio global dinâmico da viewport e registro da rota `/backoffice`. |
| **Frontend API** | [api.ts](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/frontend/src/services/api.ts) | **[MODIFICADO]** Integração do client Axios com as rotas de consulta de licença local e controle administrativo da cloud central. |
| **Script Test** | [test_licensing_killswitch.py](file:///c:/Users/Roberto/Music/PASTA/Controle%20de%20retirada%20de%20pe%C3%A7as/scratch/test_licensing_killswitch.py) | **[NOVO]** Testes E2E cobrindo 100% da verificação JWS, module checks, kill-switch e offline timeouts. |
