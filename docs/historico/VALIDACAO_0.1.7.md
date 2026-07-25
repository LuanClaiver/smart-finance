# Validação do Smart Finance 0.1.7

- Frontend React/TypeScript compilado com Vite 8.1.4.
- `frontend/dist/index.html` e arquivos JavaScript/CSS com hash presentes.
- Backend compilado e iniciado com FastAPI, Uvicorn e SQLAlchemy 2.0.51.
- `GET /api/health`: HTTP 200 e versão 0.1.7.
- Criação de despesa com a categoria **Cartões** validada no mês selecionado.
- Compras cujo mês de cobrança difere do mês aberto passam a direcionar a interface para o mês retornado pela API.
- Edição do empréstimo completo validada.
- Parcelas pagas permanecem inalteradas após editar o empréstimo.
- Parcelas pendentes têm valor e vencimento recalculados.
- Aumento da quantidade de parcelas gera novas parcelas pendentes.
- O pacote final não contém `smart_finance.db`, arquivos WAL/SHM, ambiente virtual ou `node_modules`.
- Banco da versão 0.1.6 permanece compatível sem migração.
