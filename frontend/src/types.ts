export type User = {
  id: number
  username: string
  display_name: string
  email: string
  role: 'admin' | 'user'
  is_active: boolean
  must_change_password: boolean
  created_at: string
}

export type Dashboard = {
  month: string
  income_expected: number
  income_received: number
  expense_expected: number
  expense_paid: number
  balance_expected: number
  balance_real: number
  pending_expenses: number
  entries: number
  by_category: Array<{ category_id: number | null; category_name?: string; total: number }>
  commitment_percent?: number
  income_change_percent?: number | null
  expense_change_percent?: number | null
  largest_category?: { category_id: number | null; category_name?: string; total: number } | null
  next_due?: { id: number; description: string; date: string; amount: number } | null
  card_total?: number
  budget_over_count?: number
  health_message?: string
}

export type Category = { id: number; name: string; kind: string; is_active: boolean }
export type Account = { id: number; name: string; account_type: string; initial_balance: number; reported_balance?: number | null; balance_checked_at?: string | null; is_active: boolean }
export type AccountSummary = Account & { calculated_balance: number; difference?: number | null }
export type Card = { id: number; name: string; bank: string; brand: string; credit_limit: number; closing_day: number; due_day: number; payment_account_id?: number; color: string; is_active: boolean }
export type Income = { id: number; description: string; amount_expected: number; amount_received: number; expected_date: string; received_date?: string; status: string; account_id?: number; category_id?: number; notes: string; recurrence_id?: number; external_id?: string }
export type RecurringIncome = { id: number; description: string; amount: number; expected_day: number; category_id?: number; account_id?: number; notes: string; start_month: string; end_month?: string; active: boolean }
export type Expense = { id: number; description: string; amount: number; purchase_date: string; due_date: string; paid_date?: string; category_id?: number; expense_type: string; payment_method: string; merchant: string; notes: string; status: string; account_id?: number; card_id?: number; billing_month: string; list_month: string; recurrence_id?: number; installment_group?: string; installment_number?: number; total_installments?: number; attachment_path?: string; external_id?: string }
export type RecurringExpense = { id: number; description: string; amount: number; due_day: number; category_id?: number; payment_method: string; merchant: string; account_id?: number; start_month: string; end_month?: string; active: boolean }
export type LoanInstallment = { id: number; installment_number: number; due_date: string; amount: number; status: string; paid_date?: string; account_id?: number }
export type Loan = { id: number; creditor: string; principal_amount: number; total_amount: number; interest_rate: number; installment_count: number; installment_amount: number; first_due_date: string; notes: string; active: boolean; installments: LoanInstallment[] }
export type AlertItem = { type: string; level: 'info' | 'warning' | 'danger'; title: string; message: string; date: string; amount: number; target_id: number; target_page: 'expenses' | 'loans' | 'incomes' | 'cards' | 'planning'; month?: string }
export type Budget = { id: number; month: string; category_id: number; category_name: string; limit_amount: number; spent: number; percent: number }
export type Goal = { id: number; name: string; target_amount: number; current_amount: number; target_date?: string; status: string; created_at?: string }
export type ForecastMonth = { month: string; income: number; expenses: number; balance: number; running_balance: number; card_total: number; installments_total: number }
export type InstallmentCenterItem = { kind: 'purchase' | 'loan'; group: string; name: string; total_installments: number; pending_installments: number; remaining: number; total: number; first_due: string; last_due: string }
export type InternalTransfer = { id: number; from_account_id: number; to_account_id: number; amount: number; transfer_date: string; notes: string; created_at?: string }
export type SearchResult = { kind: string; id: number; title: string; subtitle: string; amount?: number; page: string; month?: string }
export type ImportRule = { id: number; pattern: string; kind: string; category_id?: number; payment_method: string }
