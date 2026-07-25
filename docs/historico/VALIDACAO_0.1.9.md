# Validação 0.1.9

- Compilação React/TypeScript concluída com Vite 8.1.4.
- Backend compilado com `python -m compileall`.
- Fluxo validado: login administrativo, criação de despesa com vencimento em outro mês, consulta no mês visual e exclusão.
- Confirmado que o parâmetro extra de atualização não interfere na API.
- Migração de mês visual testada em duas execuções consecutivas para garantir idempotência.
- Confirmado que o frontend compilado contém o novo modal de confirmação.
- Confirmado que não há chamadas nativas a `confirm()` no código-fonte.
