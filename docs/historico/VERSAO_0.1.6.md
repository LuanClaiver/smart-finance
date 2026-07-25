# Smart Finance 0.1.6

Versão completa de restauração para usuários que preservaram apenas o arquivo `smart_finance.db`.

## Ajustes acumulados

- Correção definitiva do erro `Cannot read properties of null (reading 'reset')` ao salvar rendas, despesas e outros formulários.
- Edição de rendas, salários, despesas, pagamentos e parcelas de empréstimos.
- Notificações clicáveis que abrem, rolam e destacam o item correspondente.
- Compatibilidade com Python 3.11 a 3.14 usando SQLAlchemy 2.0.51.
- Frontend compilado incluído no pacote.
- Cache do frontend desativado para evitar carregamento de JavaScript antigo.
- Inicializador corrigido para reconhecer arquivos Vite com nomes hash (`assets/*.js` e `assets/*.css`).
- Script dedicado para restaurar um banco salvo sem sobrescrever dados por engano.

## Banco

Este pacote não inclui `backend/data/smart_finance.db`. Use `Restaurar Banco Salvo.bat` antes de iniciar.
