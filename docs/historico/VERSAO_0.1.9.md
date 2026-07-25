# Smart Finance 0.1.9

## Lista de despesas

- Corrigida a possibilidade de uma resposta antiga substituir a lista do mês atual.
- Requisições de despesas possuem controle de sequência e não utilizam cache.
- A lista é atualizada ao voltar para a janela ou aba.
- Criações, edições, pagamentos e exclusões atualizam a tela imediatamente e confirmam os dados com o backend.
- Adicionada migração única para corrigir o mês visual de lançamentos antigos que haviam herdado o mês da fatura.

## Exclusões

- Removidas as confirmações nativas do navegador.
- Adicionado modal responsivo no tema verde/escuro do Smart Finance.
- Aplicado a despesas, rendas, contas, cartões, empréstimos e usuários.
- O modal diferencia ações perigosas, apresenta detalhes e pode ser fechado com Cancelar, clique no fundo ou tecla Esc.

## Compatibilidade

- Compatível com o banco da versão 0.1.8.
- O pacote não inclui `smart_finance.db`.
- A migração de dados é executada apenas uma vez e fica registrada na tabela `app_migrations`.
