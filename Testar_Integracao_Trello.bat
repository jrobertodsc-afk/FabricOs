@echo off
title Simulação de Integração Trello -> FabricOS
color 0E
echo.
echo  ======================================================
echo  SIMULADOR DE INTEGRAÇÃO TRELLO -> FABRICOS
echo  ======================================================
echo.
echo  Este script simulará a sua modelista movendo um cartão no Trello:
echo  - Quadro: "BOAH VERÃO 26/27"
echo  - Coluna: "APROVADAS DE JULHO"
echo  - Peça: "Vestido Midi Linen Premium"
echo.
echo  Certifique-se de que o FabricOS está aberto em: http://localhost:5173
echo.
echo  Pressione qualquer tecla para disparar a simulação...
pause >nul
echo.
echo  Disparando Webhook para o FabricOS...
python -c "import httpx; res=httpx.post('http://127.0.0.1:8000/api/integrations/trello', json={'action': {'id': '5ecef', 'data': {'board': {'id': '5ecef', 'name': 'BOAH VERÃO 26/27'}, 'list': {'name': 'APROVADAS DE JULHO'}, 'listAfter': {'name': 'APROVADAS DE JULHO'}, 'card': {'id': '5ecef291', 'name': 'Vestido Midi Linen Premium', 'desc': 'Ficha Técnica:\n- Tecido: 100%% Linho Fino\n- Botões de madeira e zíper invisível'}}, 'type': 'updateCard'}}); print('Status:', res.status_code); print('Resposta:', res.text)"
echo.
echo  ======================================================
echo  PRONTO! O Webhook foi recebido pelo FabricOS!
echo.
echo  1. Vá para http://localhost:5173 no seu navegador.
echo  2. Clique na aba 'Produção (OP)' no menu lateral.
echo  3. Veja o card 'Vestido Midi Linen Premium' na coluna 'Corte'!
echo  ======================================================
echo.
pause
