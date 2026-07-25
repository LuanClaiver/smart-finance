# Smart Finance 0.1.1

## Correção principal

- Incluída a pasta `frontend/dist` pronta para uso.
- O modo normal não executa mais `npm install` nem `npm run build`.
- O inicializador interrompe com uma mensagem objetiva caso algum arquivo compilado esteja ausente.
- O backend mostra uma página explicativa caso seja iniciado manualmente sem a interface.

## Validações realizadas

- O TypeScript passou pela verificação estática sem erros.
- O pacote JavaScript compilado foi carregado sem erros de execução.
- A tela de login foi renderizada.
- O login administrativo e a abertura do dashboard foram simulados no navegador.
- A API respondeu ao login `Admin / 1234`.
- As rotas de usuário atual, dashboard e categorias responderam corretamente.
- A rota `/` retornou o HTML da interface e os arquivos em `/assets` foram encontrados.

## Estrutura de desenvolvimento mantida

- Backend modular em Python/FastAPI.
- Frontend modular em React/TypeScript.
- Interface compilada separada em `frontend/dist`.
- Banco SQLite e arquivos de comprovantes separados do código.
