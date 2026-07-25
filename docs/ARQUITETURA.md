# Arquitetura

## Backend

FastAPI, SQLAlchemy e SQLite. A autenticação usa senhas derivadas com `scrypt` e tokens assinados por HMAC. As rotas ficam divididas entre autenticação, administração, financeiro, relatórios e backups.

## Frontend

React, TypeScript e Vite. A interface é responsiva, com navegação lateral no computador e barra inferior no celular.

## Banco

O arquivo principal fica em `backend/data/smart_finance.db`. O modo WAL melhora leituras concorrentes na rede local. Cada tabela financeira possui `owner_id`, e as consultas comuns sempre filtram o usuário autenticado. O administrador pode informar outro proprietário nas chamadas administrativas da API.

## Distribuição

O frontend é compilado em `frontend/dist`. No uso normal, o próprio FastAPI serve esses arquivos pela porta 8000. No modo de desenvolvimento, o Vite usa a porta 5173 e encaminha `/api` ao backend.
