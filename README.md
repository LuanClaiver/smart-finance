# Smart Finance 0.4.0

Aplicativo financeiro local desenvolvido por **Luan Claiver — 2026**.

## Estrutura do repositório

- `backend/`: API FastAPI e banco SQLite da versão Windows.
- `frontend/`: interface React da versão Windows.
- `mobile-app/`: aplicativo Android independente com Capacitor e SQLite.
- `.github/workflows/`: geração e assinatura automática do APK.
- `scripts/mobile/`: ajustes nativos aplicados durante a compilação Android.
- `Iniciar Smart Finance.bat`: executa a versão Windows.
- `ENVIAR REPOSITORIO COMPLETO.bat`: publica esta pasta no repositório existente.
- `ATUALIZAR GITHUB.bat`: envia alterações futuras.

## Banco de dados

A versão Windows cria ou usa:

```text
backend/data/smart_finance.db
```

No Android, o banco fica no armazenamento privado do aplicativo. Em **Configurações**, o administrador pode exportar o banco para a pasta pública **Downloads**.

## Novidades da versão 0.4.0

- Correção da barra lateral no computador, com rolagem quando a altura da tela for menor.
- Remoção da informação de usuário e senha iniciais da tela de login.
- Simplificação de **Backup e banco de dados** para três ações: fazer backup, exportar e importar banco.
- Remoção do painel de transferência para o celular na versão Windows.
- Leitura de comprovantes pela câmera somente no aplicativo Android.
- Preenchimento sugerido de valor, estabelecimento, data, forma de pagamento, categoria e descrição.
- Foto do comprovante anexada automaticamente à nova despesa.
- Importação do SQLite no Windows feita em duas etapas: o arquivo é validado, o servidor reinicia automaticamente e aplica o banco somente depois de liberar o bloqueio do arquivo.
- Padronização dos botões de ação no verde do aplicativo, com cursor de mão, foco e animação de interação.

A leitura por câmera sempre abre o formulário para revisão antes do lançamento ser salvo. A primeira leitura pode precisar de internet para carregar o mecanismo de reconhecimento de texto; as demais funções do aplicativo continuam locais.

## Compatibilidade de importação no Android

O APK ainda consegue importar pacotes de transferência gerados por versões anteriores do Smart Finance. Essa opção permanece em **Configurações** apenas para compatibilidade com arquivos já existentes.

## APK pelo GitHub

A geração acontece no fluxo **02 - Gerar APK Android**. Os segredos de assinatura configurados no repositório não são removidos por atualizações de código. O passo a passo completo está no arquivo `COMO ENVIAR AO GITHUB E GERAR O APK.txt`, na raiz do pacote distribuído.

## Conta inicial

```text
Usuário: Admin
Senha: 1234
```

## Próximas melhorias

A avaliação das telas de referência e a sequência recomendada estão em:

`MELHORIAS-AVALIADAS-0.4.0.md`
