import { jsPDF } from 'jspdf'
import type { Category, Dashboard, Expense, Income, Loan } from '../../types'

function currency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, number - 1, 1))
}

export async function createMonthlyPdf(input: {
  month: string
  userName: string
  dashboard: Dashboard
  incomes: Income[]
  expenses: Expense[]
  loans: Loan[]
  categories: Category[]
}): Promise<Blob> {
  const document = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const margin = 16
  let y = 18
  const line = (label: string, value: string, color?: [number, number, number]) => {
    document.setFont('helvetica', 'normal')
    document.setTextColor(80, 90, 86)
    document.text(label, margin, y)
    document.setFont('helvetica', 'bold')
    if (color) document.setTextColor(...color)
    else document.setTextColor(20, 45, 34)
    document.text(value, pageWidth - margin, y, { align: 'right' })
    y += 8
  }

  document.setFillColor(7, 35, 23)
  document.roundedRect(10, 10, pageWidth - 20, 38, 4, 4, 'F')
  document.setTextColor(255, 255, 255)
  document.setFont('helvetica', 'bold')
  document.setFontSize(21)
  document.text('Smart Finance', margin, 26)
  document.setFontSize(12)
  document.setFont('helvetica', 'normal')
  document.text(`Resumo mensal • ${monthLabel(input.month)}`, margin, 36)
  document.text(input.userName, pageWidth - margin, 36, { align: 'right' })
  y = 61

  document.setFont('helvetica', 'bold')
  document.setFontSize(15)
  document.setTextColor(10, 45, 30)
  document.text('Resumo financeiro', margin, y)
  y += 10
  document.setFontSize(11)
  line('Renda prevista', currency(input.dashboard.income_expected))
  line('Renda recebida', currency(input.dashboard.income_received), [22, 140, 77])
  line('Despesas previstas', currency(input.dashboard.expense_expected))
  line('Despesas pagas', currency(input.dashboard.expense_paid), [202, 138, 4])
  line('Saldo previsto', currency(input.dashboard.balance_expected), input.dashboard.balance_expected < 0 ? [210, 50, 50] : [22, 140, 77])
  line('Saldo real', currency(input.dashboard.balance_real), input.dashboard.balance_real < 0 ? [210, 50, 50] : [22, 140, 77])

  y += 4
  document.setFont('helvetica', 'bold')
  document.setFontSize(15)
  document.setTextColor(10, 45, 30)
  document.text('Despesas por categoria', margin, y)
  y += 9
  document.setFontSize(10)
  const categoryMap = new Map(input.categories.map((item) => [item.id, item.name]))
  const categoryTotals = new Map<number | null, number>()
  input.expenses.forEach((item) => categoryTotals.set(item.category_id || null, (categoryTotals.get(item.category_id || null) || 0) + Number(item.amount)))
  const ordered = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])
  if (ordered.length === 0) {
    document.setFont('helvetica', 'normal')
    document.setTextColor(100, 110, 105)
    document.text('Nenhuma despesa registrada no mês.', margin, y)
    y += 8
  } else {
    ordered.forEach(([categoryId, total]) => line(categoryId ? categoryMap.get(categoryId) || 'Outros' : 'Sem categoria', currency(total)))
  }

  y += 4
  document.setFont('helvetica', 'bold')
  document.setFontSize(15)
  document.setTextColor(10, 45, 30)
  document.text('Indicadores', margin, y)
  y += 10
  document.setFontSize(11)
  line('Rendas registradas', String(input.incomes.length))
  line('Despesas registradas', String(input.expenses.length))
  line('Pendências do mês', String(input.dashboard.pending_expenses))
  const pendingLoans = input.loans.flatMap((loan) => loan.installments).filter((item) => item.status !== 'paid' && item.due_date.startsWith(input.month)).length
  line('Parcelas de empréstimos pendentes', String(pendingLoans))

  document.setFont('helvetica', 'normal')
  document.setFontSize(8)
  document.setTextColor(110, 120, 115)
  document.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`, margin, 286)
  document.text('Dados armazenados localmente no dispositivo.', pageWidth - margin, 286, { align: 'right' })
  return document.output('blob')
}
