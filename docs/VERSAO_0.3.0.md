# Smart Finance 0.3.0

## Aplicativo Android independente

- nova pasta `mobile-app`;
- Capacitor 8;
- SQLite nativo no Android;
- login local por usuário/e-mail e senha;
- login por Conta Google usando Credential Manager por meio do plugin social login;
- conta inicial `Admin / 1234`;
- usuários e dados separados;
- dashboard, rendas, despesas, contas, cartões, faturas e empréstimos locais;
- notificações locais de vencimento;
- comprovantes no armazenamento do app;
- PDF mensal criado no celular;
- backup JSON diário e manual;
- scripts para preparar, configurar Google, consultar SHA-1, gerar APK e abrir Android Studio.

## Separação dos dados

O banco Android é independente de `backend/data/smart_finance.db`. Não há sincronização automática nesta versão.
