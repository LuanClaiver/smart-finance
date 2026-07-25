# Smart Finance no GitHub Actions

Este projeto pode gerar o APK na nuvem, sem Android Studio e sem Android SDK no computador.

## 1. Criar o repositório

Crie no GitHub um repositório **privado**, vazio e chamado, por exemplo, `smart-finance`.
Não marque README, `.gitignore` ou licença durante a criação.

## 2. Enviar o projeto

Instale apenas o Git for Windows e execute:

```text
Enviar para GitHub.bat
```

Cole a URL HTTPS do repositório vazio, por exemplo:

```text
https://github.com/SEU_USUARIO/smart-finance.git
```

## 3. Criar as senhas da assinatura

No repositório, abra:

```text
Settings > Secrets and variables > Actions > Secrets
```

Crie:

- `ANDROID_KEYSTORE_PASSWORD`: uma senha forte para o arquivo de assinatura;
- `ANDROID_KEY_ALIAS`: use `smartfinance`;
- `ANDROID_KEY_PASSWORD`: outra senha forte ou a mesma senha do keystore.

Guarde essas senhas fora do GitHub.

## 4. Gerar a chave Android

Abra:

```text
Actions > 01 - Gerar chave Android > Run workflow
```

Ao terminar:

1. abra a execução;
2. baixe o artefato `chave-smart-finance`;
3. guarde `smart-finance-release.jks` em local seguro;
4. abra `keystore-base64.txt` e copie todo o conteúdo;
5. crie o segredo `ANDROID_KEYSTORE_BASE64` com esse conteúdo;
6. abra `informacoes-chave.txt` e copie o SHA-1;
7. depois de guardar tudo, apague a execução/artefato da chave no GitHub.

## 5. Configurar o Google Cloud

No Google Cloud, use:

```text
Pacote Android: com.smartfinance.app
SHA-1: valor de informacoes-chave.txt
```

Crie uma credencial OAuth do tipo Android e outra do tipo Aplicativo da Web.
Copie o ID do cliente Web, que termina em:

```text
.apps.googleusercontent.com
```

No GitHub, abra:

```text
Settings > Secrets and variables > Actions > Variables
```

Crie a variável:

```text
GOOGLE_WEB_CLIENT_ID
```

com o ID do cliente Web.

O ID de cliente é público no aplicativo; não use nem envie um client secret.

## 6. Gerar o APK

Abra:

```text
Actions > 02 - Gerar APK Android > Run workflow
```

Ao terminar, baixe o artefato:

```text
Smart-Finance-APK
```

Ele contém:

```text
Smart-Finance.apk
Smart-Finance-SHA256.txt
```

Transfira o APK ao celular e permita a instalação da origem usada para abrir o arquivo.

## 7. Atualizações futuras

Altere o projeto e execute:

```text
Atualizar GitHub.bat
```

Quando algum arquivo de `mobile-app` mudar, o workflow do APK será iniciado automaticamente. Também é possível executá-lo manualmente pela guia Actions.

## Nunca envie ao GitHub

- `smart_finance.db`;
- comprovantes pessoais;
- `.env.local`;
- arquivos `.jks` ou `.keystore`;
- senhas;
- conteúdo do `keystore-base64.txt`.

O `.gitignore` do projeto já bloqueia esses itens, mas confira sempre antes do primeiro envio.
