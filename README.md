# Smart Finance 0.3.5

Aplicativo financeiro local desenvolvido por **Luan Claiver — 2026**.

## Estrutura limpa

- `backend/`: API FastAPI e banco SQLite da versão Windows.
- `frontend/`: interface React da versão Windows.
- `mobile-app/`: aplicativo Android independente com Capacitor e SQLite.
- `.github/workflows/`: geração e assinatura automática do APK.
- `scripts/mobile/`: ajustes nativos aplicados durante a compilação Android.
- `Iniciar Smart Finance.bat`: executa a versão Windows.
- `ENVIAR REPOSITORIO COMPLETO.bat`: conecta esta pasta limpa ao repositório existente e registra também a exclusão dos arquivos antigos.
- `ATUALIZAR GITHUB.bat`: envia alterações futuras.

## Banco de dados

O repositório não contém bancos pessoais. A versão Windows cria ou usa:

```text
backend/data/smart_finance.db
```

No Android, o banco fica no armazenamento privado do aplicativo. Em **Configurações**, o administrador pode exportá-lo diretamente para a pasta pública **Downloads**.

## APK pelo GitHub

A geração acontece no fluxo **02 - Gerar APK Android**. Os quatro segredos de assinatura já configurados no repositório não são removidos por atualizações de código.

## Conta inicial

```text
Usuário: Admin
Senha: 1234
```
