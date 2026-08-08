# Smart Finance 0.4.4

## Alterações da versão 0.4.4
- Corrigida a importação de bancos `.db` no APK. O seletor de arquivos agora permite escolher o banco mesmo em aparelhos que não reconhecem o MIME de SQLite.
- Antes de substituir o banco, o APK valida o `integrity_check` do SQLite e confirma a presença das tabelas essenciais do Smart Finance.
- A substituição do banco ficou mais segura: usa cópia temporária, sincronização em disco, arquivo de rollback e localização alternativa do banco interno quando o Android não fornece uma URL de arquivo utilizável.
- O backup preventivo da importação passa a usar o armazenamento privado do aplicativo como alternativa quando o Android bloquear a pasta Documentos.
- Compatibilidade validada com o arquivo `smart-finance-2026-08-08-17-41-50.db` fornecido para teste.

## Alterações da versão 0.4.3
- Toda despesa passa a pertencer ao **mês do vencimento**, independentemente da forma de pagamento ou do mês em que foi cadastrada.
- Exemplo validado: uma despesa cadastrada em agosto com vencimento em `08/09/2026` não aparece em agosto e aparece em setembro de 2026.
- Painel, relatórios, alertas, versão Windows e aplicativo Android utilizam a mesma regra.
- Migração automática corrige os lançamentos já existentes para o mês indicado em `due_date`.

## Alterações da versão 0.4.2
- Campos monetários usam formato brasileiro: ao digitar `1000`, o campo é normalizado para `1.000,00`; centavos podem ser informados com vírgula ou ponto e são exibidos sempre com duas casas.
- Ajuste aplicado a rendas, despesas, contas, cartões, empréstimos e parcelas, no computador e no aplicativo mobile.
- Login reforçado para aceitar nome de usuário ou e-mail; o administrador padrão também pode entrar com `Admin` / `1234` ou `admin@smartfinance.com` / `1234`.

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
