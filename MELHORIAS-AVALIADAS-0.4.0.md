# Smart Finance 0.4.0 — correções e planejamento

## Corrigido nesta versão

1. **Backup e banco de dados no computador**
   - Permanecem apenas: **Fazer backup agora**, **Exportar banco** e **Importar banco**.
   - Os botões duplicados vinham de complementos antigos carregados depois da interface principal.

2. **Transferência para o celular no computador**
   - O painel foi removido da interface Windows.
   - O Android mantém a importação apenas para compatibilidade com pacotes antigos já gerados.

3. **Tela de login**
   - Removido o texto visível `Conta inicial: Admin / 1234` no computador e no aplicativo móvel.
   - A conta inicial continua existindo para o primeiro acesso, mas não fica exposta na tela.

4. **Barra lateral do computador**
   - A navegação agora possui rolagem própria quando a tela tem pouca altura.
   - O conteúdo principal não força a largura da página nem corta os últimos itens do menu.

5. **Câmera e preenchimento automático — somente Android**
   - Botão **Ler comprovante** nas telas de despesas e rendas.
   - Abre a câmera traseira do celular.
   - Tenta identificar valor, estabelecimento/origem, data, pagamento, descrição e categoria.
   - Abre o formulário preenchido para revisão; nada é salvo sem confirmação.
   - Em uma nova despesa, a foto é anexada automaticamente ao lançamento.
   - A leitura detalhada de cada produto ainda não faz parte desta primeira versão.

## Melhorias dos exemplos: viabilidade e ordem recomendada

### 1. Orçamentos e metas — alta viabilidade

**Recomendado para a próxima versão.**

- orçamento mensal geral;
- limite por categoria;
- percentual utilizado e valor restante;
- avisos em 80% e 100% do limite;
- meta de reserva de emergência;
- histórico mensal do orçamento.

O Smart Finance já possui despesas, categorias e alertas, então esta área pode ser criada sem alterar a estrutura principal do aplicativo.

### 2. Relatórios por período e locais — alta viabilidade

**Também recomendado para a próxima versão.**

- filtro por data inicial e final;
- gastos por categoria;
- estabelecimentos com maior gasto;
- comparação entre meses;
- exportação do período em PDF;
- seleção de lançamentos para exportar.

A maior parte pode aproveitar os dados atuais de `categoria`, `estabelecimento`, `valor` e `data`.

### 3. Reserva de emergência — alta viabilidade

Pode ser integrada à tela de orçamento e metas:

- valor-alvo;
- saldo reservado;
- progresso;
- prazo estimado;
- sugestão mensal para atingir a meta.

É importante definir se o valor reservado será apenas uma meta visual ou se ficará vinculado a uma conta real.

### 4. Análise de compras — viabilidade média

É possível entregar primeiro uma versão baseada nos lançamentos existentes:

- locais mais usados;
- quantidade de compras;
- ticket médio;
- gastos recorrentes;
- distribuição por categoria;
- comparação de preço médio por estabelecimento quando a descrição for semelhante.

A qualidade depende de descrições e nomes de estabelecimentos consistentes. A câmera implementada nesta versão ajuda a padronizar parte desses dados.

### 5. Produtos mais comprados e recomendações — projeto maior

Para mostrar itens como arroz, leite ou fraldas individualmente, o sistema precisa armazenar os produtos de cada nota:

- nome do produto;
- quantidade;
- preço unitário;
- preço total;
- estabelecimento;
- data da compra.

Isso exige uma segunda etapa do leitor de comprovantes, com reconhecimento de linhas e correção de nomes. É viável, mas deve ser feito depois de estabilizar a leitura do valor total e do estabelecimento.

### 6. Arquivo mensal de comprovantes — viabilidade média

Pode ser criado com:

- pasta virtual por mês;
- filtros por categoria e estabelecimento;
- busca por descrição;
- visualização de imagens e PDFs;
- exportação de um mês em ZIP.

Os comprovantes já são anexados às despesas, portanto o trabalho principal é criar a tela de consulta e os filtros.

### 7. Recomendações inteligentes de economia — projeto gradual

Primeira fase, sem inteligência artificial externa:

- detectar aumento de gasto por categoria;
- avisar sobre compras repetidas;
- apontar estabelecimentos mais caros com base no próprio histórico;
- sugerir redução de assinaturas ou despesas recorrentes.

Uma fase futura pode usar modelos de IA, mas as recomendações iniciais podem ser feitas localmente com regras transparentes e sem enviar dados financeiros para terceiros.

### 8. Área perigosa e exclusão de conta — viável, mas exige proteção

Pode incluir:

- exportação de todos os dados antes da exclusão;
- confirmação pela senha;
- confirmação digitando uma frase;
- exclusão definitiva da conta e dos comprovantes;
- bloqueio da exclusão do último administrador sem criação de outro.

Deve ser implementada somente com backup e confirmações fortes para evitar perda acidental.

## Sequência sugerida

1. Orçamento mensal, limites por categoria e reserva de emergência.
2. Relatórios com período, categorias e principais estabelecimentos.
3. Arquivo mensal de comprovantes.
4. Análise de compras por estabelecimento e ticket médio.
5. Leitura de produtos individuais nas notas.
6. Recomendações inteligentes de economia.
7. Área de exclusão definitiva da conta.
