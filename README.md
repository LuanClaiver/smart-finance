# Smart Finance 0.4.1

Aplicativo financeiro local desenvolvido por **Luan Claiver — 2026**.

## Componentes

- `backend/`: API FastAPI, SQLite, backups, relatórios e transferência de dados.
- `frontend/`: interface React da versão para computador.
- `mobile-app/`: aplicativo Android independente com Capacitor e SQLite.
- `branding/`: arquivos editáveis e exportações da identidade visual.
- `scripts/mobile/`: ajustes nativos aplicados durante a geração Android.
- `.github/workflows/`: criação da chave e compilação assinada do APK.

## Funcionalidades principais

- Controle de rendas, despesas, contas, cartões e empréstimos.
- Relatórios financeiros em PDF.
- Login, cadastro, recuperação de senha e administração de usuários.
- Temas claro e escuro.
- Backup diário automático.
- Exportação e importação do banco SQLite.
- Transferência de dados do computador para o celular por ZIP.
- Importação móvel com opção de mesclar ou substituir os dados e backup preventivo.
- Comprovantes anexados às despesas e leitura por câmera no Android.
- Faturas de cartão passam a impactar despesas, painel e relatórios no mês do vencimento.
- A aba Cartões usa o mesmo mês de vencimento da aba Despesas, evitando divergência entre as telas.

## Interface

A tela de acesso e os fundos seguem a organização visual adotada no Smart Notes, mantendo os botões e destaques na identidade azul, índigo e roxa do Smart Finance.

Nas tabelas de **Rendas** e **Despesas**, as ações permanecem alinhadas em posições fixas. Os controles usam o estilo leve em texto, sem blocos preenchidos, com realce no `hover` e cursor de mão.

## Desenvolvimento da versão web

```bash
cd frontend
npm ci
npm run dev
```

Compilação:

```bash
npm run build
```

O backend pode ser iniciado pelo arquivo `Iniciar Smart Finance.bat` ou diretamente com as dependências de `backend/requirements.txt`.

## Aplicativo Android

O projeto mobile está em `mobile-app/`. A geração oficial usa o fluxo **02 - Gerar APK Android** em `.github/workflows` e aplica os recursos nativos definidos em `scripts/mobile/`.

Segredos exigidos no GitHub:

- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_KEYSTORE_BASE64`

Use **01 - Gerar chave Android** apenas na configuração inicial. Preserve a mesma chave para todas as atualizações futuras.

## Armazenamento

Windows:

```text
backend/data/smart_finance.db
backend/storage/
backend/backups/
```

No Android, o banco fica no armazenamento privado do aplicativo. Arquivos exportados são salvos na área pública escolhida pelo sistema.

## Scripts do Windows

- `Iniciar Smart Finance.bat`: executa o sistema local.
- `ENVIAR REPOSITORIO COMPLETO.bat`: primeiro envio ao GitHub.
- `ATUALIZAR GITHUB.bat`: publica atualizações futuras.
