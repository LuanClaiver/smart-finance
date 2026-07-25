# Smart Finance 0.1.3

## Correção principal

- Compatibilidade com Python 3.14.
- SQLAlchemy atualizado de 2.0.36 para 2.0.51.
- O inicializador agora detecta uma instalação antiga/incompatível e atualiza o ambiente virtual automaticamente.
- O navegador só é aberto depois que `/api/health` responde.
- Mensagens de diagnóstico exibem as versões de Python e SQLAlchemy em uso.

## Dados

A atualização sem banco não contém `backend/data/smart_finance.db` e não substitui os dados existentes.
