# Smart Finance Mobile 0.4.4

Aplicativo Android local criado com React, Capacitor e SQLite.

## Importação de banco SQLite

Em **Configurações > Backup e banco de dados**, o APK aceita arquivos `.db` compatíveis com o Smart Finance. A versão 0.4.4 valida o banco com o SQLite nativo antes da substituição e mantém uma etapa de rollback para evitar perda do banco atual caso a troca falhe.


## Regra de mês das despesas

Toda despesa aparece no mês do vencimento. Exemplo: um lançamento criado em agosto com vencimento em 08/09/2026 fica em setembro de 2026. Bancos antigos são normalizados automaticamente.

## Acesso inicial

- Usuário: `Admin`
- Senha: `1234`

O login e os dados financeiros funcionam localmente no aparelho.

## Leitura de comprovantes pela câmera

Nas telas **Despesas** e **Rendas**, toque em **Ler comprovante** para abrir a câmera traseira. O aplicativo analisa a foto e sugere:

- valor;
- estabelecimento ou origem;
- descrição;
- data;
- forma de pagamento;
- categoria.

O formulário é aberto para conferência antes de salvar. Em despesas, a foto também é anexada automaticamente ao lançamento. A primeira leitura pode precisar de internet para preparar o mecanismo OCR.

## Compilação

A compilação principal é feita pelo GitHub Actions em:

`.github/workflows/02-gerar-apk-android.yml`

## Importação de versões anteriores

Em **Configurações**, o APK ainda pode importar um ZIP gerado por versões anteriores da edição Windows. O aplicativo cria um backup automático e permite substituir ou adicionar os dados sem alterar usuários ou senhas.
