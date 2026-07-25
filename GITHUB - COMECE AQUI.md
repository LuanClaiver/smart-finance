# Smart Finance no GitHub Actions — APK sem Google

Este projeto gera o APK na nuvem, sem Android Studio e sem Android SDK no computador.

## 1. Segredos necessários

Em `Configurações > Segredos e variáveis > Ações > Segredos`, mantenha:

- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_KEYSTORE_BASE64`

Não é necessário criar projeto no Google Cloud nem a variável `GOOGLE_WEB_CLIENT_ID`.

## 2. Gerar o APK

Abra:

`Ações > 02 - Gerar APK Android > Executar fluxo de trabalho`

Ao terminar, baixe o artefato `Smart-Finance-APK`. Dentro estarão:

- `Smart-Finance.apk`
- `Smart-Finance-SHA256.txt`

## 3. Acesso inicial

- Usuário: `Admin`
- Senha: `1234`

O aplicativo funciona localmente no celular, sem computador e sem internet.

## 4. Atualizações

Após alterar arquivos, execute `Atualizar GitHub.bat`. Mudanças em `mobile-app` iniciam uma nova compilação automaticamente.

## Nunca envie ao GitHub

- `smart_finance.db`
- comprovantes pessoais
- arquivos `.jks` ou `.keystore`
- senhas
- conteúdo do `keystore-base64.txt`
