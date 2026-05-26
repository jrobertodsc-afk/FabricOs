Set WshShell = CreateObject("WScript.Shell")
' Executa fabricos_server.exe em segundo plano (0 = oculto, False = nao espera terminar)
WshShell.Run "fabricos_server.exe", 0, False
WScript.Sleep 3000
' Abre o navegador padrao no endereco local do FabricOS
WshShell.Run "http://127.0.0.1:8000", 9
