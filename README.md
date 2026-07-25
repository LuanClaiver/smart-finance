# Smart Finance 0.2.6

> **Restauração:** este pacote não contém banco. Execute `Restaurar Banco Salvo.bat` e selecione seu `smart_finance.db` antes de iniciar.

Sistema financeiro local para Windows 10/11, acessível no computador e em outros dispositivos da mesma rede.

## Conta administrativa inicial

- Usuário: `Admin`
- Nome exibido: `Administrador`
- E-mail: `admin@smartfinance.com`
- Senha: `1234`

O sistema solicita a troca da senha temporária após o primeiro acesso.

## Como iniciar

1. Instale **Python 3.11, 3.12, 3.13 ou 3.14** e marque a opção `Add Python to PATH`.
2. Extraia todo o projeto. O Node.js LTS só é necessário para alterar e recompilar o frontend.
3. Restaure seu banco com `Restaurar Banco Salvo.bat`.
4. Execute `Iniciar Smart Finance.bat`.
5. Na primeira execução ou após uma atualização, o preparador será chamado uma única vez. Nas aberturas seguintes o servidor inicia diretamente.

Acesso local:

- `http://localhost:8000`
- `http://smartfinance.local:8000`
- `http://IP-DO-COMPUTADOR:8000`

Se o celular acessar pelo IP, mas não pelo hostname, execute `Configurar Rede.bat` como administrador e confirme que a rede do Windows está marcada como **Privada**. Alguns roteadores bloqueiam mDNS ou usam isolamento entre dispositivos; nesse caso, o IP continua sendo o método mais confiável.

## Desenvolvimento

Execute `Modo Desenvolvimento.bat`.

- Backend FastAPI: `http://localhost:8000`
- Documentação da API: `http://localhost:8000/docs`
- Frontend Vite: `http://localhost:5173`

## Funcionalidades implementadas nesta base

- Cadastro aberto e login local.
- Usuários com dados financeiros separados.
- E-mail e nome de usuário únicos sem diferenciar maiúsculas e minúsculas.
- Chave de recuperação de senha.
- Administração de usuários, edição de dados, permissões, redefinição de senha e visualização financeira por usuário.
- Rendas variáveis por mês.
- Despesas fixas e variáveis.
- Recorrências mensais com geração de lançamentos futuros.
- Cartões, faturas mensais e pagamento da fatura.
- Compras parceladas distribuídas nas faturas futuras.
- Contas e carteiras.
- Empréstimos e parcelas.
- Alertas internos e notificações do navegador enquanto a página está aberta.
- Dashboard e gráficos.
- Relatório mensal resumido em PDF.
- Comprovantes em imagem ou PDF armazenados fora do banco de dados.
- Categorias personalizadas, editáveis por ativação ou ocultação.
- Backup automático diário e backup manual.
- mDNS para `smartfinance.local`.

## Backups

Os backups ficam em `backend/backups`. O sistema cria no máximo um backup automático por dia e mantém os 30 arquivos mais recentes. Use `Criar Backup.bat` para gerar um backup adicional.

O backup ZIP contém o banco SQLite e os comprovantes. A restauração ainda é manual nesta versão: feche o sistema, extraia o banco para `backend/data/smart_finance.db` e os comprovantes para `backend/storage`.

## APK Android

A pasta `mobile` documenta a próxima etapa. O APK com banco próprio, escolhido para o projeto, não faz parte desta versão 0.1. Ele exigirá uma camada de persistência SQLite dentro do Android e telas adaptadas para não depender do backend Python do computador.

O navegador do celular já pode usar o sistema pela rede local. Os dados, nesse modo, ficam no banco do computador. Notificações externas do navegador podem ser limitadas em acesso por IP usando HTTP; a central de alertas dentro do sistema continua funcionando.

## Observações importantes

- O projeto é local e usa SQLite em modo WAL.
- Não exponha a porta 8000 diretamente para a internet.
- Troque a senha padrão do administrador.
- Para uso profissional, mantenha o código em Git e faça backup da pasta do projeto.


## Compatibilidade do Python

A versão 0.1.3 aceita Python 3.11, 3.12, 3.13 e 3.14. O inicializador atualiza automaticamente o SQLAlchemy quando encontra um ambiente antigo.

## Atualização 0.1.5

- Notificações abrem diretamente o lançamento correspondente.
- Rendas, despesas/pagamentos e parcelas de empréstimos podem ser editados.
- Corrigida a mensagem de erro exibida depois de salvar um formulário com sucesso.
## Atualização 0.1.7

- Cada card de empréstimo possui o botão **Editar**, além da edição individual das parcelas.
- Ao editar o empréstimo, parcelas pagas são preservadas e somente as pendentes são recalculadas.
- Despesas lançadas em cartão ou na categoria Cartões permanecem visíveis: quando o mês de cobrança for diferente, a tela muda automaticamente para o mês correto.
- Esta versão não altera a estrutura das tabelas e aceita diretamente o banco `smart_finance.db` da versão 0.1.6.


## Atualização 0.1.8

- Toda despesa fica visível no mês selecionado na tela de Despesas, mesmo que o vencimento, pagamento ou fatura estejam em outro mês.
- O mês da lista e o mês da fatura passaram a ser armazenados separadamente. Assim, a compra continua aparecendo em Despesas e também entra na fatura correta do cartão.
- Compras parceladas são distribuídas a partir do mês selecionado.
- O banco antigo é atualizado automaticamente com a coluna `list_month`, sem apagar registros.
- Avisos visuais no estilo do Smart Notes confirmam ações de salvar, editar, pagar, receber, excluir, anexar comprovante, gerar PDF, criar backup e alterações administrativas.
- Erros também aparecem em avisos destacados, sem travar ou esconder o formulário.


## Atualização 0.1.9

- A lista de despesas passou a ignorar respostas antigas quando o mês é alterado rapidamente.
- As consultas da API e da tela de Despesas usam `no-store`, evitando que o navegador reapresente uma resposta anterior.
- A lista é atualizada ao retornar para a aba ou janela do Smart Finance.
- Lançamentos novos entram na tabela imediatamente e depois são confirmados por uma nova leitura do banco.
- Bancos atualizados a partir de versões anteriores recebem uma correção única para despesas cujo mês visual foi preenchido automaticamente com o mês da fatura.
- Todas as exclusões usam um card de confirmação no tema do Smart Finance, sem a janela simples do navegador.
- O modal informa claramente o que será removido e exige confirmação explícita.


## Atualização 0.2.0

- Cartões podem ser editados pelo próprio card.
- Ao abrir uma fatura vazia, o sistema localiza automaticamente o próximo mês com lançamentos do cartão.
- O mês realmente aberto é exibido no título da fatura.
- Descrições antigas como `Fatura Cartão Nubank` são normalizadas para `Cartão Nubank`.
- O mês da cobrança aparece em uma linha separada, sem texto colado ao nome da despesa.
- Formulários, faturas e cards abertos fecham com `Esc`, pelo botão × ou ao clicar fora.
- O iniciador diário agora é rápido e não verifica nem instala todas as dependências em cada abertura.
- `Preparar Smart Finance.bat` instala o ambiente uma única vez; `Reparar Smart Finance.bat` recria o ambiente em caso de falha.


## Atualização 0.2.6

- A data de vencimento aparece ao editar qualquer despesa, independentemente da categoria e da forma de pagamento.
- A nova data de vencimento é enviada para a API e persistida no SQLite.
- A central de alertas funciona como painel responsivo no celular, sem ultrapassar a tela, com rolagem interna e fechamento por `Esc`, botão × ou toque fora.
- O iniciador rápido reutiliza o ambiente Python preparado pelas versões anteriores.

## Aplicativo Android

A partir da versão 0.3.0, o projeto inclui `mobile-app`, uma versão Android independente com SQLite no celular, login local, login Google, notificações e PDF.

Comece por:

```text
COMECE AQUI - APK.txt
Preparar APK.bat
```

As instruções completas estão em `docs/APK_E_GOOGLE_LOGIN.md`.
