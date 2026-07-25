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
  by_category: Array<{ category_id: number | null; total: number }>
}

export type Category = { id: number; name: string; kind: string; is_active: boolean }
export type Account = { id: number; name: string; account_type: string; initial_balance: number; is_active: boolean }
export type Card = { id: number; name: string; bank: string; brand: string; credit_limit: number; closing_day: number; due_day: number; payment_account_id?: number; color: string; is_active: boolean }
export type Income = { id: number; description: string; amount_expected: number; amount_received: number; expected_date: string; received_date?: string; status: string; account_id?: number; category_id?: number; notes: string }
export type Expense = { id: number; description: string; amount: number; purchase_date: string; due_date: string; paid_date?: string; category_id?: number; expense_type: string; payment_method: string; merchant: string; notes: string; status: string; account_id?: number; card_id?: number; billing_month: string; list_month: string; installment_number?: number; total_installments?: number; attachment_path?: string }
export type LoanInstallment = { id: number; installment_number: number; due_date: string; amount: number; status: string; paid_date?: string; account_id?: number }
export type Loan = { id: number; creditor: string; principal_amount: number; total_amount: number; interest_rate: number; installment_count: number; installment_amount: number; first_due_date: string; notes: string; active: boolean; installments: LoanInstallment[] }
export type AlertItem = { type: string; level: 'info' | 'warning' | 'danger'; title: string; message: string; date: string; amount: number; target_id: number; target_page: 'expenses' | 'loans' | 'incomes'; month?: string }
