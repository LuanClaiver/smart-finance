# Validação do Smart Finance 0.1.6

- Frontend React/TypeScript compilado com Vite 8.1.4.
- `frontend/dist/index.html` e arquivos `assets/*.js`/`assets/*.css` presentes.
- Backend iniciado com FastAPI/Uvicorn e SQLAlchemy 2.0.51.
- `GET /api/health`: HTTP 200 e versão 0.1.6.
- Página raiz, JavaScript e CSS: HTTP 200.
- Login `Admin / 1234` validado em banco de teste.
- Nenhuma chamada insegura a `event.currentTarget.reset()` nos formulários de rendas/despesas.
- Botões de edição presentes em rendas, despesas/pagamentos e parcelas de empréstimos.
- Alertas internos e notificações do navegador apontam para página, mês e ID do lançamento.
- Pacote final não contém `smart_finance.db`.
- Inicializador aceita nomes hash gerados pelo Vite em `frontend/dist/assets`.
