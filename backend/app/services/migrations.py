from __future__ import annotations

from datetime import datetime

from sqlalchemy.engine import Engine


LEGACY_EXPENSE_MONTH_REPAIR = "0.1.9-repair-expense-reference-month"
CARD_EXPENSE_LABEL_REPAIR = "0.2.0-normalize-card-expense-labels"
CARD_DUE_MONTH_REPAIR = "0.4.1-card-expenses-by-due-month"


def run_migrations(engine: Engine) -> None:
    """Aplica migrações pequenas e compatíveis com bancos das versões anteriores."""
    with engine.begin() as connection:
        table = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'"
        ).first()
        if not table:
            return

        columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(expenses)").fetchall()
        }
        if "list_month" not in columns:
            connection.exec_driver_sql("ALTER TABLE expenses ADD COLUMN list_month VARCHAR(7)")

        connection.exec_driver_sql(
            "UPDATE expenses SET list_month = billing_month "
            "WHERE list_month IS NULL OR TRIM(list_month) = ''"
        )
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_expenses_list_month ON expenses (list_month)"
        )

        # Registra migrações de dados para que cada correção seja executada apenas
        # uma vez, mesmo quando o servidor é iniciado diariamente.
        connection.exec_driver_sql(
            "CREATE TABLE IF NOT EXISTS app_migrations ("
            "name VARCHAR(120) PRIMARY KEY, applied_at VARCHAR(40) NOT NULL)"
        )
        applied = connection.exec_driver_sql(
            "SELECT 1 FROM app_migrations WHERE name = ?",
            (LEGACY_EXPENSE_MONTH_REPAIR,),
        ).first()
        if not applied:
            # A versão 0.1.8 preencheu lançamentos antigos com o mês da fatura.
            # Quando a compra pertence a outro mês, isso podia esconder a despesa
            # até um alerta abrir o mês da cobrança. Para os registros já existentes
            # nessa situação, restauramos o mês visual a partir da data da compra.
            # Lançamentos novos continuam usando explicitamente o mês selecionado
            # na tela e não são alterados após esta migração única.
            connection.exec_driver_sql(
                "UPDATE expenses "
                "SET list_month = strftime('%Y-%m', purchase_date) "
                "WHERE list_month = billing_month "
                "AND purchase_date IS NOT NULL "
                "AND strftime('%Y-%m', purchase_date) <> billing_month"
            )
            connection.exec_driver_sql(
                "INSERT INTO app_migrations (name, applied_at) VALUES (?, ?)",
                (LEGACY_EXPENSE_MONTH_REPAIR, datetime.utcnow().isoformat()),
            )
        label_applied = connection.exec_driver_sql(
            "SELECT 1 FROM app_migrations WHERE name = ?",
            (CARD_EXPENSE_LABEL_REPAIR,),
        ).first()
        if not label_applied:
            # Evita textos duplicados como "Fatura Cartão Nubank / Fatura: 2026-08".
            # O mês da cobrança já é exibido em uma linha separada na interface.
            connection.exec_driver_sql(
                "UPDATE expenses SET description = TRIM(SUBSTR(description, 8)) "
                "WHERE card_id IS NOT NULL AND description LIKE 'Fatura Cartão %'"
            )
            connection.exec_driver_sql(
                "UPDATE expenses SET description = TRIM(SUBSTR(description, 11)) "
                "WHERE card_id IS NOT NULL AND description LIKE 'Fatura do Cartão %'"
            )
            connection.exec_driver_sql(
                "INSERT INTO app_migrations (name, applied_at) VALUES (?, ?)",
                (CARD_EXPENSE_LABEL_REPAIR, datetime.utcnow().isoformat()),
            )

        due_month_applied = connection.exec_driver_sql(
            "SELECT 1 FROM app_migrations WHERE name = ?",
            (CARD_DUE_MONTH_REPAIR,),
        ).first()
        if not due_month_applied:
            # A partir da 0.4.1, compras/faturas de cartão aparecem no mês do
            # vencimento. Corrige os registros existentes sem alterar despesas
            # que não estão vinculadas a cartão.
            connection.exec_driver_sql(
                "UPDATE expenses SET list_month = strftime('%Y-%m', due_date) "
                "WHERE card_id IS NOT NULL AND due_date IS NOT NULL"
            )
            connection.exec_driver_sql(
                "INSERT INTO app_migrations (name, applied_at) VALUES (?, ?)",
                (CARD_DUE_MONTH_REPAIR, datetime.utcnow().isoformat()),
            )

