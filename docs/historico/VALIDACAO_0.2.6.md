# Validação 0.2.6

- Código Python compilado com `compileall`.
- Scripts `runtime-patch-025.js` e `runtime-patch-026.js` validados com `node --check`.
- Backend iniciado localmente e `/api/health` respondeu com a versão 0.2.6.
- Interface distribuída carregou a correção `runtime-patch-026.js`.
- Alteração de `due_date` validada em uma cópia do banco SQLite enviado anteriormente.
- Pacote final verificado sem `smart_finance.db`, `.venv`, `node_modules` ou `__pycache__`.
