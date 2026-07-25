# Smart Finance Mobile

Versão Android independente do Smart Finance, baseada em React, Capacitor e SQLite.

## Comandos

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Na raiz do projeto existem arquivos `.bat` que automatizam o processo no Windows.

## Configuração

Copie `.env.example` para `.env.local` e preencha:

```env
VITE_GOOGLE_WEB_CLIENT_ID=SEU_ID.apps.googleusercontent.com
```

Consulte `../docs/APK_E_GOOGLE_LOGIN.md`.
