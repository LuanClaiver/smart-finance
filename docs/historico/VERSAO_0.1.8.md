# Smart Finance 0.1.8

## Despesas sempre visíveis

- Cada despesa passa a guardar um **mês da lista** separado do mês da fatura.
- O mês selecionado na tela de Despesas determina onde o lançamento será exibido.
- Categoria, vencimento, forma de pagamento, situação, conta e cartão não removem o item da lista.
- Compras parceladas aparecem a partir do mês selecionado e seguem nos meses seguintes.
- O mês da fatura do cartão continua sendo calculado separadamente, sem perder o agrupamento correto na tela de Cartões.
- Bancos anteriores recebem automaticamente a coluna `list_month`; os dados existentes são preservados.

## Avisos de ações

Foi criado um sistema global de avisos no estilo do Smart Notes, com mensagens para:

- salvar e editar rendas, despesas, empréstimos, parcelas, contas e cartões;
- registrar pagamentos, recebimentos e faturas pagas;
- anexar comprovantes;
- excluir registros;
- alterar senha, chave de recuperação e categorias;
- criar backup e gerar PDF;
- exibir erros de forma visível sem interromper a tela.

## Banco de dados

Este pacote não contém `smart_finance.db`. Copie seu banco para:

`backend/data/smart_finance.db`

A migração é executada automaticamente ao iniciar o sistema.
