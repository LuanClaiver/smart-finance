# Smart Finance Mobile 0.5.2

Aplicativo Android independente do Smart Finance, com banco SQLite local.

## Destaques da 0.5.2

- Compatibilidade de login com bancos vindos do Windows e do próprio APK.
- Reconhecimento de hashes PBKDF2 e do scrypt legado do desktop.
- Conversão automática de contas antigas para o formato compartilhado depois do primeiro login válido, sem mudar a senha.
- Login por nome de usuário ou e-mail preservado.
- Todas as funções do Motor Financeiro 0.5.0 e as correções da 0.5.1 permanecem disponíveis.

A geração Android é preparada pelo script `scripts/mobile/Aplicar-Ajustes-Android.ps1` e pelos workflows do GitHub Actions.
