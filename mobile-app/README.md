# Smart Finance Mobile 0.4.1

Aplicativo Android local criado com React, Capacitor e SQLite.

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
