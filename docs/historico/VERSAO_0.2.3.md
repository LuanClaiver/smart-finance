# Smart Finance 0.2.3

## Formulário de despesas contextual

- A forma de pagamento agora inclui `Cartão de crédito`.
- Os campos Data da compra, Vencimento, Cartão e Parcelas aparecem somente quando Cartão de crédito está selecionado.
- Para Pix, débito, dinheiro, transferência e boleto, esses campos ficam ocultos.
- O backend continua recebendo datas internas válidas, mantendo compatibilidade com o banco e os relatórios.
- Gastos fixos mensais continuam usando Dia do vencimento e não oferecem cartão de crédito nesta etapa.

## Destaque de vencimentos

- Verde: despesa paga.
- Amarelo: vencimento no dia atual ou nos próximos 7 dias.
- Vermelho: despesa vencida.
- O destaque usa uma faixa colorida discreta na lateral esquerda da linha e um leve degradê, preservando a leitura.
- Uma legenda compacta foi adicionada acima da tabela.

## Compatibilidade

- Não há alteração de tabelas ou migração de banco nesta versão.
- Bancos das versões 0.1.x e 0.2.x continuam compatíveis.
