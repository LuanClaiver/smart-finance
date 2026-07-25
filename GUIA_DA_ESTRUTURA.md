# O que é importante no Smart Finance

## Essencial para usar o sistema

- `Iniciar Smart Finance.bat`: inicialização diária rápida.
- `Preparar Smart Finance.bat`: prepara o Python na primeira execução.
- `Reparar Smart Finance.bat`: recria o ambiente Python em caso de erro.
- `backend/app/`: servidor, autenticação, banco e regras financeiras.
- `backend/requirements.txt`: lista das dependências Python.
- `backend/data/smart_finance.db`: banco principal e arquivo mais importante para backup.
- `backend/storage/`: comprovantes anexados.
- `backend/backups/`: backups automáticos e manuais.
- `frontend/dist/`: interface pronta utilizada no funcionamento normal.

## Importante para alterar o código

- `frontend/src/`: código-fonte React e TypeScript.
- `frontend/package.json` e `frontend/package-lock.json`: dependências do frontend.
- `frontend/vite.config.ts` e os arquivos `tsconfig`: configuração da compilação.
- `scripts/` e `Modo Desenvolvimento.bat`: ferramentas de desenvolvimento.
- `docs/`: documentação técnica.
- `mobile/`: preparação para a futura etapa Android; ainda não é um APK pronto.

## Arquivos que podem ser recriados

- `backend/.venv/`: ambiente Python criado automaticamente; não contém seus dados.
- `frontend/node_modules/`: dependências de desenvolvimento; não precisa ser copiada.
- `__pycache__/`: cache do Python.

## Arquivos apenas informativos

- `VERSAO_*.md` e `VALIDACAO_*.md`: histórico das alterações e testes. Podem ser apagados sem impedir a execução.

Para mover o sistema para outro computador, leve o projeto completo, o banco `backend/data/smart_finance.db` e a pasta `backend/storage/`.

## mobile-app

Código da versão Android independente. É relevante para gerar o APK e contém:

- `src/`: telas e regras locais;
- `src/services/mobile/`: SQLite, Google, notificações, backup e PDF;
- `capacitor.config.ts`: configuração Android;
- `package.json`: dependências do APK;
- `.env.local`: ID público do Google, criado pelo configurador e não versionado;
- `android/`: criado por `Preparar APK.bat` no seu computador.

A pasta `mobile-app/node_modules` e os arquivos de compilação podem ser recriados e não precisam ser copiados manualmente.
