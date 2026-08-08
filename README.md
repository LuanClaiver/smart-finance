# Smart Finance 0.5.3 — Motor Financeiro

Aplicativo financeiro local desenvolvido por **Luan Claiver — 2026**.

## Correção da versão 0.5.3

- Corrigida a incompatibilidade de login depois de importar um banco do APK no computador.
- O backend passa a validar tanto **PBKDF2** (formato usado no APK) quanto **scrypt** (formato usado nas versões desktop anteriores).
- Novas senhas no Windows passam a ser gravadas em PBKDF2, o mesmo formato do Android.
- O APK também consegue validar contas antigas em scrypt e converte o hash automaticamente depois do primeiro login correto.
- O login continua funcionando por **usuário ou e-mail**, inclusive com o alias `Admin` para o administrador padrão.
- Nenhuma senha é redefinida durante a importação; a compatibilidade ocorre sobre os hashes já existentes.
- As correções de inicialização e backup local da 0.5.1 foram preservadas.

## Principais novidades da versão 0.5.0

- **Cartões e faturas automáticas:** compras no cartão são organizadas pela data da compra, fechamento e vencimento. Parcelamentos geram as parcelas futuras e cada parcela aparece no mês em que realmente vence.
- **Regra única de vencimento:** toda despesa, de qualquer forma de pagamento, pertence ao mês do vencimento. Data da compra, vencimento e pagamento ficam separadas.
- **Recorrências editáveis:** despesas recorrentes podem ser interrompidas pela própria despesa, removendo somente os lançamentos futuros pendentes. Rendas recorrentes também podem ser criadas e interrompidas.
- **Planejamento:** projeção de 3, 6 ou 12 meses, orçamentos mensais por categoria, metas financeiras e central de parcelas/compromissos futuros.
- **Dashboard inteligente:** comparação com o mês anterior, percentual de renda comprometida, próximas contas, cartões, maior categoria e avisos de orçamento.
- **Contas e conciliação:** saldo calculado x saldo informado, registro de conferência e transferências entre contas sem transformar a transferência em renda/despesa.
- **Importação de extratos:** leitura de CSV e OFX, pré-visualização, classificação por regras memorizadas e identificadores para reduzir duplicações.
- **Pesquisa e filtros:** busca global e filtros avançados em despesas e rendas.
- **Sincronização local PC ↔ APK:** o PC continua exportando o pacote completo para o celular; o APK também gera `.sfsync` para mesclar as alterações de volta ao computador, com backup preventivo e deduplicação.
- **APK mais seguro:** PIN, biometria quando disponível, bloqueio automático ao voltar ao aplicativo, notificações locais e atalhos de lançamento rápido.
- **Backup reforçado:** importação de `.db` com validação de integridade/estrutura, resumo do conteúdo antes da substituição e backup de segurança.

## Compatibilidade preservada

- Login por **nome de usuário ou e-mail**; administrador padrão: `Admin` / `1234` ou `admin@smartfinance.com` / `1234` em bancos novos.
- Bancos das versões 0.4.x são migrados automaticamente para a estrutura 0.5.0.
- Campos monetários aceitam valores inteiros ou com centavos e exibem o padrão brasileiro.
- O banco SQLite, comprovantes e backups continuam locais.

## Componentes

- `backend/`: FastAPI, SQLite, backups, relatórios, planejamento, sincronização e importações.
- `frontend/`: interface React para computador.
- `mobile-app/`: aplicativo Android independente com Capacitor e SQLite.
- `scripts/mobile/`: ajustes nativos aplicados durante a geração Android, incluindo biometria e exportação de arquivos.
- `.github/workflows/`: geração da chave e compilação assinada do APK.

## Desenvolvimento web

```bash
cd frontend
npm ci
npm run dev
```

Compilação:

```bash
npm run build
```

O backend pode ser iniciado por `Iniciar Smart Finance.bat` ou diretamente com as dependências de `backend/requirements.txt`.

## Aplicativo Android

O projeto mobile está em `mobile-app/`. A geração oficial usa o fluxo **02 - Gerar APK Android** no GitHub Actions.

Segredos exigidos no GitHub:

- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_KEYSTORE_BASE64`

Use **01 - Gerar chave Android** somente na configuração inicial e preserve a mesma chave nas atualizações.

## Armazenamento

Windows:

```text
backend/data/smart_finance.db
backend/storage/
backend/backups/
```

No Android, o banco fica no armazenamento privado do aplicativo. Exportações são compartilhadas ou salvas na área pública escolhida pelo sistema.

## Scripts do Windows

- `Iniciar Smart Finance.bat`: executa o sistema local.
- `ENVIAR REPOSITORIO COMPLETO.bat`: primeiro envio ao GitHub.
- `Atualizar GitHub.bat`: publica atualizações futuras.
