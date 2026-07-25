# Smart Finance Android e login Google

## O que foi criado

A pasta `mobile-app` contém uma versão Android independente do Smart Finance:

- React e TypeScript;
- Capacitor 8;
- SQLite nativo no aparelho;
- login com usuário e senha;
- login com Conta Google;
- notificações locais;
- geração e compartilhamento de PDF;
- backup diário em JSON;
- comprovantes no armazenamento privado do aplicativo.

A versão Android não chama o backend Python. O computador pode ficar desligado.

## Pré-requisitos

- Windows 10 ou 11;
- Node.js 22 ou superior;
- Android Studio;
- Android SDK instalado pelo Android Studio;
- JDK selecionado pelo Android Studio;
- internet durante a instalação inicial das dependências e para configurar o Google.

## Preparação automática

Execute na raiz do projeto:

```text
Preparar APK.bat
```

O script:

1. verifica o Node.js;
2. executa `npm install` em `mobile-app`;
3. compila o React;
4. cria o projeto Android quando necessário;
5. sincroniza Capacitor e plugins;
6. aplica permissões, privacidade e o ícone de notificações.

## Configuração do Google Cloud

Use o identificador fixo do aplicativo:

```text
com.smartfinance.app
```

### 1. Obter o SHA-1

Depois de executar `Preparar APK.bat`, execute:

```text
Ver SHA-1 Google.bat
```

No resultado, procure o bloco `Variant: debug` e copie o `SHA1`.

### 2. Criar o projeto e a tela de consentimento

No Google Cloud Console:

1. crie ou selecione um projeto;
2. abra a plataforma Google Auth;
3. configure a tela de consentimento;
4. informe o nome `Smart Finance`;
5. durante os testes, adicione os e-mails autorizados.

### 3. Criar credencial Android

Crie um ID OAuth do tipo **Android**:

- pacote: `com.smartfinance.app`;
- SHA-1: resultado do `Ver SHA-1 Google.bat`.

Quando gerar uma versão assinada para uso definitivo, cadastre também o SHA-1 da chave de lançamento.

### 4. Criar credencial Web

Crie também um ID OAuth do tipo **Aplicativo da Web**.

Copie o valor semelhante a:

```text
123456789-xxxxxxxx.apps.googleusercontent.com
```

Execute:

```text
Configurar Google Login.bat
```

Cole o ID de cliente Web. O script gravará `mobile-app/.env.local`, recompilará e sincronizará o Android.

> Não coloque segredo de cliente no aplicativo. O projeto utiliza somente o ID público do cliente OAuth.

## Gerar APK para teste

Execute:

```text
Gerar APK Debug.bat
```

O arquivo será copiado para:

```text
APK/Smart-Finance-debug.apk
```

Transfira o APK ao celular e permita a instalação de aplicativos da origem utilizada.

## Gerar APK assinado

Para uma versão que possa receber atualizações sem reinstalar do zero:

1. execute `Abrir Android Studio.bat`;
2. no Android Studio, escolha **Build > Generate Signed App Bundle / APK**;
3. selecione **APK**;
4. crie e guarde uma chave `.jks`;
5. gere a variante `release`;
6. cadastre o SHA-1 dessa chave no cliente OAuth Android do Google Cloud.

Guarde a chave e a senha. Atualizações futuras precisam ser assinadas com a mesma chave.

## Login e funcionamento offline

### Usuário e senha

Funciona totalmente offline. A conta inicial é:

```text
Admin / 1234
```

### Conta Google

O login Google usa o seletor nativo de contas do Android. A primeira autenticação e eventuais revalidações precisam de internet. Depois que a sessão local estiver aberta, as funções financeiras continuam locais.

### Dados separados

O banco do computador e o banco do APK são independentes. O Google identifica a conta, mas não sincroniza dados financeiros.

## Banco e backups no Android

O aplicativo usa SQLite nativo. O banco permanece no armazenamento privado do app.

Um backup JSON é criado uma vez por dia e os backups manuais podem ser gerados em **Configurações**. Os arquivos são salvos em `Documentos/SmartFinance` e podem ser compartilhados.

## Atualizar o aplicativo

Depois de modificar `mobile-app/src`:

```text
Gerar APK Debug.bat
```

Para uma versão assinada, compile e sincronize e depois gere novamente pelo Android Studio usando a mesma chave.

## Solução de problemas do Google

- erro 10 ou conta não exibida: confira pacote e SHA-1;
- botão desabilitado: execute `Configurar Google Login.bat`;
- funciona no debug, mas não no release: cadastre o SHA-1 da chave de release;
- conta supervisionada não aparece: a implementação utiliza `filterByAuthorizedAccounts: false`;
- depois de mudar credenciais: desinstale o APK antigo, sincronize e instale a nova compilação.
