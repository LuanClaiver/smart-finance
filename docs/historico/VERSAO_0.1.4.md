# Smart Finance 0.1.4

## Correções

- Corrigida a mensagem `Cannot read properties of null (reading 'reset')` exibida depois de salvar formulários.
- Todos os formulários assíncronos agora preservam a referência do formulário antes da chamada à API.
- Alertas e notificações tornaram-se clicáveis e abrem diretamente o lançamento relacionado.
- O mês correto é selecionado automaticamente ao abrir uma renda ou despesa por uma notificação.
- O lançamento de destino recebe destaque visual e é centralizado na tela.

## Edição de lançamentos

- Rendas e salários podem ser editados.
- Despesas e seus dados de pagamento podem ser editados.
- Parcelas de empréstimos podem ter valor, vencimento, situação, data de pagamento e conta alterados.
- A edição de uma compra parcelada altera somente a parcela selecionada.

## Backend

- Alertas agora informam o ID e a página do registro relacionado.
- Adicionada rota `PATCH /api/loan-installments/{id}`.
- O mês de cobrança é recalculado ao editar uma despesa ou trocar o cartão.
