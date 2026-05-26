# Checklist de Progresso: Fase 8 - Licenciamento Modular, Proteção de IP e Backoffice com Trava Remota

- `[x]` **Passo 1: Banco de Dados Local (Configurações de Licença - migrate_v7.py)**
  - `[x]` Criar a tabela `license_config` no banco SQLite para armazenar as credenciais da licença criptografada, o status offline e flags de bloqueio.
  - `[x]` Criar e rodar o script de migração `scratch/migrate_v7.py` para atualizar todas as bases de dados.
- `[x]` **Passo 2: Middleware de Licenciamento & Travas no Backend (license_middleware.py)**
  - `[x]` Desenvolver `license_middleware.py` com `verify_module_license` (FastAPI dependency checking if a module is licensed) and local lockdown mechanisms (`is_locked = True`).
- `[x]` **Passo 3: Integração das Travas de Módulos nas Rotas Backend**
  - `[x]` Proteger rotas de produção em `production.py`, `materials.py`, `pieces.py` com `Depends(verify_module_license("producao"))`.
  - `[x]` Proteger rotas de logística em `distributions.py` com `Depends(verify_module_license("logistica"))`.
- `[x]` **Passo 4: Central Backoffice de Licenças & Simulador de Updates (backoffice_server.py)**
  - `[x]` Criar `backoffice_server.py` no backend que simula o Servidor de Licenciamento da FabricOS (endpoints para validar licenças, atualizar canais (Estável/Beta/Dev), e desabilitar instâncias à distância).
- `[x]` **Passo 5: Interfaces de Controle no Frontend (Mobile/Dashboard)**
  - `[x]` Criar a tela do **Backoffice Central** (`BackofficeDashboard.tsx`) permitindo monitorar clientes, gerenciar canais de atualização e acionar a Trava Remota (Kill-Switch).
  - `[x]` Criar a tela vermelha de bloqueio de licença suspensa (`LicenseLockScreen.tsx`).
  - `[x]` Integrar a tela de bloqueio e o contexto de verificação de licença global em `App.tsx`.
- `[x]` **Passo 6: Testes e Validação de Licenciamento**
  - `[x]` Criar o script de teste E2E `scratch/test_licensing_killswitch.py` para validar bloqueios de módulo, estouro de período off-line (tolerância) e a trava remota (kill-switch).
  - `[x]` Executar o teste E2E e certificar sucesso absoluto.
  - `[x]` Rodar `npx tsc --noEmit` no frontend para garantir 0 erros de compilação TypeScript.

