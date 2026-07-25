# Validação da versão 0.1.3

- Todos os módulos Python passaram por compilação de sintaxe.
- Os modelos SQLAlchemy foram carregados e as 9 tabelas foram registradas.
- O servidor Uvicorn iniciou e respondeu `200` em `/api/health`.
- A rota `/` entregou a interface compilada.
- O login `Admin / 1234` respondeu com sucesso.
- O ZIP não inclui `.venv`, `node_modules` ou caches.
- A atualização sem banco não contém `backend/data/smart_finance.db`.

## Compatibilidade corrigida

O projeto agora fixa SQLAlchemy 2.0.51 e o inicializador atualiza ambientes que ainda estejam com SQLAlchemy 2.0.36.
