import { execute, queryOne, queryRows } from './db'
import { addMonths, asNumber, boolInt, monthOf, safeDate, todayLocal } from './utils'

export type AdvancedResult<T> = { handled: true; value: T } | { handled: false }

type Row = Record<string, unknown>

function requiredText(payload: Row, key: string, label: string): string {
  const value = String(payload[key] || '').trim()
  if (!value) throw new Error(`${label} é obrigatório.`)
  return value
}

function monthStart(month: string): string { return `${month}-01` }

async function accountBalance(owner: number, accountId: number): Promise<number> {
  const account = await queryOne<Row>('SELECT * FROM accounts WHERE id=? AND owner_id=?', [accountId, owner])
  if (!account) throw new Error('Conta não encontrada.')
  const scalar = async (sql: string, values: unknown[]) => asNumber((await queryOne<Row>(sql, values))?.total)
  const income = await scalar("SELECT COALESCE(SUM(amount_received),0) total FROM incomes WHERE owner_id=? AND account_id=? AND status='received'", [owner, accountId])
  const expense = await scalar("SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE owner_id=? AND account_id=? AND status='paid'", [owner, accountId])
  const loan = await scalar("SELECT COALESCE(SUM(amount),0) total FROM loan_installments WHERE owner_id=? AND account_id=? AND status='paid'", [owner, accountId])
  const incoming = await scalar('SELECT COALESCE(SUM(amount),0) total FROM internal_transfers WHERE owner_id=? AND to_account_id=?', [owner, accountId])
  const outgoing = await scalar('SELECT COALESCE(SUM(amount),0) total FROM internal_transfers WHERE owner_id=? AND from_account_id=?', [owner, accountId])
  return asNumber(account.initial_balance) + income - expense - loan + incoming - outgoing
}

async function generateRecurringIncome(owner: number, recurrenceId: number, months: number): Promise<number> {
  const row = await queryOne<Row>('SELECT * FROM recurring_incomes WHERE id=? AND owner_id=?', [recurrenceId, owner])
  if (!row || !Boolean(row.active)) return 0
  let generated = 0
  for (let offset = 0; offset < Math.max(1, Math.min(120, months)); offset += 1) {
    const cursor = addMonths(monthStart(String(row.start_month)), offset)
    const month = monthOf(cursor)
    if (row.end_month && month > String(row.end_month)) break
    const exists = await queryOne<Row>('SELECT id FROM incomes WHERE owner_id=? AND recurrence_id=? AND substr(expected_date,1,7)=? LIMIT 1', [owner, recurrenceId, month])
    if (exists) continue
    const [year, number] = month.split('-').map(Number)
    const expected = safeDate(year, number, Number(row.expected_day))
    await execute(`INSERT INTO incomes(owner_id,description,amount_expected,amount_received,expected_date,received_date,status,account_id,category_id,notes,recurrence_id,external_id,created_at)
      VALUES (?,?,?,?,?,NULL,'pending',?,?,?,?,?,?)`, [owner, row.description, asNumber(row.amount), 0, expected, row.account_id || null, row.category_id || null, String(row.notes || ''), recurrenceId, `recurring-income-${recurrenceId}-${month}`, new Date().toISOString()])
    generated += 1
  }
  return generated
}

async function generateRecurringExpense(owner: number, recurrenceId: number, months: number): Promise<number> {
  const row = await queryOne<Row>('SELECT * FROM recurring_expenses WHERE id=? AND owner_id=?', [recurrenceId, owner])
  if (!row || !Boolean(row.active)) return 0
  let generated = 0
  for (let offset = 0; offset < Math.max(1, Math.min(120, months)); offset += 1) {
    const cursor = addMonths(monthStart(String(row.start_month)), offset)
    const month = monthOf(cursor)
    if (row.end_month && month > String(row.end_month)) break
    const exists = await queryOne<Row>('SELECT id FROM expenses WHERE owner_id=? AND recurrence_id=? AND substr(due_date,1,7)=? LIMIT 1', [owner, recurrenceId, month])
    if (exists) continue
    const [year, number] = month.split('-').map(Number)
    const due = safeDate(year, number, Number(row.due_day))
    await execute(`INSERT INTO expenses(owner_id,description,amount,purchase_date,due_date,paid_date,category_id,expense_type,payment_method,merchant,notes,status,account_id,card_id,attachment_path,recurrence_id,installment_group,installment_number,total_installments,billing_month,list_month,external_id,created_at)
      VALUES (?,?,?,?,?,NULL,?,'fixed',?,?,?,'pending',?,NULL,NULL,?,NULL,NULL,NULL,?,?,?,?)`, [owner, row.description, asNumber(row.amount), due, due, row.category_id || null, String(row.payment_method || 'pix'), String(row.merchant || ''), '', row.account_id || null, recurrenceId, month, month, `recurring-expense-${recurrenceId}-${month}`, new Date().toISOString()])
    generated += 1
  }
  return generated
}

export async function handleAdvancedLocal<T>(url: URL, method: string, payload: Row, owner: number): Promise<AdvancedResult<T>> {
  const parts = url.pathname.split('/').filter(Boolean)

  if (url.pathname === '/planning/forecast' && method === 'GET') {
    const months = Math.max(1, Math.min(36, Number(url.searchParams.get('months') || 12)))
    const start = String(url.searchParams.get('start') || monthOf(todayLocal()))
    const result: Row[] = []
    let running = 0
    for (let offset = 0; offset < months; offset += 1) {
      const month = monthOf(addMonths(monthStart(start), offset))
      const income = asNumber((await queryOne<Row>('SELECT COALESCE(SUM(amount_expected),0) total FROM incomes WHERE owner_id=? AND substr(expected_date,1,7)=?', [owner, month]))?.total)
      const expense = asNumber((await queryOne<Row>('SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE owner_id=? AND substr(due_date,1,7)=?', [owner, month]))?.total)
      const loan = asNumber((await queryOne<Row>('SELECT COALESCE(SUM(amount),0) total FROM loan_installments WHERE owner_id=? AND substr(due_date,1,7)=?', [owner, month]))?.total)
      const card = asNumber((await queryOne<Row>('SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE owner_id=? AND card_id IS NOT NULL AND substr(due_date,1,7)=?', [owner, month]))?.total)
      const installments = asNumber((await queryOne<Row>('SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE owner_id=? AND installment_group IS NOT NULL AND substr(due_date,1,7)=?', [owner, month]))?.total) + loan
      const balance = income - expense - loan; running += balance
      result.push({ month, income, expenses: expense + loan, balance, running_balance: running, card_total: card, installments_total: installments })
    }
    return { handled: true, value: result as T }
  }

  if (url.pathname === '/budgets' && method === 'GET') {
    const month = String(url.searchParams.get('month') || monthOf(todayLocal()))
    const rows = await queryRows<Row>(`SELECT b.*, c.name category_name, COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.owner_id=b.owner_id AND e.category_id=b.category_id AND substr(e.due_date,1,7)=b.month),0) spent FROM budgets b JOIN categories c ON c.id=b.category_id WHERE b.owner_id=? AND b.month=? ORDER BY c.name`, [owner, month])
    return { handled: true, value: rows.map(row => ({ ...row, limit_amount: asNumber(row.limit_amount), spent: asNumber(row.spent), percent: asNumber(row.limit_amount) ? asNumber(row.spent) / asNumber(row.limit_amount) * 100 : 0 })) as T }
  }
  if (url.pathname === '/budgets' && method === 'POST') {
    const existing = await queryOne<Row>('SELECT id FROM budgets WHERE owner_id=? AND month=? AND category_id=?', [owner, payload.month, payload.category_id])
    let id = Number(existing?.id || 0)
    if (id) await execute('UPDATE budgets SET limit_amount=? WHERE id=? AND owner_id=?', [asNumber(payload.limit_amount), id, owner])
    else id = await execute('INSERT INTO budgets(owner_id,month,category_id,limit_amount,created_at) VALUES (?,?,?,?,?)', [owner, String(payload.month), Number(payload.category_id), asNumber(payload.limit_amount), new Date().toISOString()])
    return { handled: true, value: (await queryOne<Row>('SELECT * FROM budgets WHERE id=?', [id])) as T }
  }
  if (parts[0] === 'budgets' && parts[1] && method === 'DELETE') { await execute('DELETE FROM budgets WHERE id=? AND owner_id=?', [Number(parts[1]), owner]); return { handled: true, value: { message: 'Orçamento removido' } as T } }

  if (url.pathname === '/goals' && method === 'GET') return { handled: true, value: await queryRows<Row>('SELECT * FROM goals WHERE owner_id=? ORDER BY status,target_date,name', [owner]) as T }
  if (url.pathname === '/goals' && method === 'POST') {
    const id = await execute('INSERT INTO goals(owner_id,name,target_amount,current_amount,target_date,status,created_at) VALUES (?,?,?,?,?,?,?)', [owner, requiredText(payload,'name','Nome'), asNumber(payload.target_amount), asNumber(payload.current_amount), payload.target_date || null, String(payload.status || 'active'), new Date().toISOString()])
    return { handled: true, value: await queryOne<Row>('SELECT * FROM goals WHERE id=?', [id]) as T }
  }
  if (parts[0] === 'goals' && parts[1]) {
    const id = Number(parts[1])
    if (method === 'PATCH') { await execute('UPDATE goals SET name=?,target_amount=?,current_amount=?,target_date=?,status=? WHERE id=? AND owner_id=?', [requiredText(payload,'name','Nome'), asNumber(payload.target_amount), asNumber(payload.current_amount), payload.target_date || null, String(payload.status || 'active'), id, owner]); return { handled: true, value: await queryOne<Row>('SELECT * FROM goals WHERE id=?', [id]) as T } }
    if (method === 'DELETE') { await execute('DELETE FROM goals WHERE id=? AND owner_id=?', [id, owner]); return { handled: true, value: { message:'Meta excluída' } as T } }
  }

  if (url.pathname === '/accounts/summary' && method === 'GET') {
    const accounts = await queryRows<Row>('SELECT * FROM accounts WHERE owner_id=? ORDER BY name', [owner])
    const result: Row[] = []
    for (const row of accounts) { const calculated = await accountBalance(owner, Number(row.id)); const reported = row.reported_balance == null ? null : asNumber(row.reported_balance); result.push({ ...row, calculated_balance: calculated, reported_balance: reported, difference: reported == null ? null : reported - calculated }) }
    return { handled:true, value: result as T }
  }
  if (parts[0] === 'accounts' && parts[1] && parts[2] === 'reconcile' && method === 'POST') {
    const id=Number(parts[1]); const calculated=await accountBalance(owner,id); const reported=asNumber(payload.reported_balance); await execute('UPDATE accounts SET reported_balance=?,balance_checked_at=? WHERE id=? AND owner_id=?',[reported,new Date().toISOString(),id,owner]); return { handled:true,value:{message:'Saldo informado atualizado',calculated_balance:calculated,reported_balance:reported,difference:reported-calculated} as T }
  }

  if (url.pathname === '/transfers' && method === 'GET') { const month=url.searchParams.get('month'); return {handled:true,value:await queryRows<Row>(`SELECT * FROM internal_transfers WHERE owner_id=?${month?' AND substr(transfer_date,1,7)=?':''} ORDER BY transfer_date DESC,created_at DESC`, month?[owner,month]:[owner]) as T} }
  if (url.pathname === '/transfers' && method === 'POST') {
    if(Number(payload.from_account_id)===Number(payload.to_account_id)) throw new Error('Origem e destino devem ser contas diferentes.')
    const id=await execute('INSERT INTO internal_transfers(owner_id,from_account_id,to_account_id,amount,transfer_date,notes,created_at) VALUES (?,?,?,?,?,?,?)',[owner,Number(payload.from_account_id),Number(payload.to_account_id),asNumber(payload.amount),String(payload.transfer_date),String(payload.notes||''),new Date().toISOString()]); return {handled:true,value:await queryOne<Row>('SELECT * FROM internal_transfers WHERE id=?',[id]) as T}
  }
  if(parts[0]==='transfers'&&parts[1]&&method==='DELETE'){await execute('DELETE FROM internal_transfers WHERE id=? AND owner_id=?',[Number(parts[1]),owner]);return{handled:true,value:{message:'Transferência excluída'} as T}}

  if(url.pathname==='/installments/center'&&method==='GET'){
    const purchaseRows=await queryRows<Row>(`SELECT installment_group 'group',description name,MAX(total_installments) total_installments,COUNT(*) count,COALESCE(SUM(amount),0) total,MIN(due_date) first_due,MAX(due_date) last_due,COALESCE(SUM(CASE WHEN status<>'paid' THEN 1 ELSE 0 END),0) pending_installments,COALESCE(SUM(CASE WHEN status<>'paid' THEN amount ELSE 0 END),0) remaining FROM expenses WHERE owner_id=? AND installment_group IS NOT NULL GROUP BY installment_group,description`,[owner])
    const loanRows=await queryRows<Row>(`SELECT 'loan-'||l.id 'group',l.creditor name,l.installment_count total_installments,l.total_amount total,l.first_due_date first_due,MAX(li.due_date) last_due,COALESCE(SUM(CASE WHEN li.status<>'paid' THEN 1 ELSE 0 END),0) pending_installments,COALESCE(SUM(CASE WHEN li.status<>'paid' THEN li.amount ELSE 0 END),0) remaining FROM loans l LEFT JOIN loan_installments li ON li.loan_id=l.id WHERE l.owner_id=? GROUP BY l.id`,[owner])
    return{handled:true,value:[...purchaseRows.map(x=>({...x,kind:'purchase'})),...loanRows.map(x=>({...x,kind:'loan'}))] as T}
  }

  if(url.pathname==='/search'&&method==='GET'){
    const q=String(url.searchParams.get('q')||'').trim(); if(q.length<2)return{handled:true,value:[] as T}; const like=`%${q}%`; const result:Row[]=[]
    const expenses=await queryRows<Row>('SELECT id,description,amount,due_date FROM expenses WHERE owner_id=? AND (description LIKE ? OR merchant LIKE ? OR notes LIKE ?) ORDER BY due_date DESC LIMIT 15',[owner,like,like,like]); expenses.forEach(x=>result.push({kind:'expense',id:x.id,title:x.description,subtitle:`Despesa • ${x.due_date}`,amount:x.amount,page:'expenses',month:String(x.due_date).slice(0,7)}))
    const incomes=await queryRows<Row>('SELECT id,description,amount_expected,expected_date FROM incomes WHERE owner_id=? AND (description LIKE ? OR notes LIKE ?) ORDER BY expected_date DESC LIMIT 10',[owner,like,like]); incomes.forEach(x=>result.push({kind:'income',id:x.id,title:x.description,subtitle:`Renda • ${x.expected_date}`,amount:x.amount_expected,page:'incomes',month:String(x.expected_date).slice(0,7)}))
    const cards=await queryRows<Row>('SELECT id,name,bank,credit_limit FROM cards WHERE owner_id=? AND (name LIKE ? OR bank LIKE ?) LIMIT 5',[owner,like,like]); cards.forEach(x=>result.push({kind:'card',id:x.id,title:x.name,subtitle:`Cartão • ${x.bank}`,amount:x.credit_limit,page:'cards'}))
    return{handled:true,value:result as T}
  }

  if(url.pathname==='/import-rules'&&method==='GET')return{handled:true,value:await queryRows<Row>('SELECT * FROM import_rules WHERE owner_id=? ORDER BY pattern',[owner]) as T}
  if(url.pathname==='/import-rules'&&method==='POST'){
    const pattern=requiredText(payload,'pattern','Padrão');const kind=String(payload.kind||'expense');const found=await queryOne<Row>('SELECT id FROM import_rules WHERE owner_id=? AND pattern=? COLLATE NOCASE AND kind=?',[owner,pattern,kind]);let id=Number(found?.id||0)
    if(id)await execute('UPDATE import_rules SET category_id=?,payment_method=? WHERE id=?',[payload.category_id||null,String(payload.payment_method||'pix'),id]);else id=await execute('INSERT INTO import_rules(owner_id,pattern,kind,category_id,payment_method,created_at) VALUES (?,?,?,?,?,?)',[owner,pattern,kind,payload.category_id||null,String(payload.payment_method||'pix'),new Date().toISOString()]);return{handled:true,value:await queryOne<Row>('SELECT * FROM import_rules WHERE id=?',[id]) as T}
  }
  if(parts[0]==='import-rules'&&parts[1]&&method==='DELETE'){await execute('DELETE FROM import_rules WHERE id=? AND owner_id=?',[Number(parts[1]),owner]);return{handled:true,value:{message:'Regra excluída'} as T}}

  if(url.pathname==='/recurring-incomes'&&method==='GET')return{handled:true,value:await queryRows<Row>('SELECT * FROM recurring_incomes WHERE owner_id=? ORDER BY description',[owner]) as T}
  if(url.pathname==='/recurring-incomes'&&method==='POST'){
    const id=await execute(`INSERT INTO recurring_incomes(owner_id,description,amount,expected_day,category_id,account_id,notes,start_month,end_month,active) VALUES (?,?,?,?,?,?,?,?,?,?)`,[owner,requiredText(payload,'description','Descrição'),asNumber(payload.amount),Number(payload.expected_day),payload.category_id||null,payload.account_id||null,String(payload.notes||''),String(payload.start_month),payload.end_month||null,boolInt(payload.active??true)]);const generated=await generateRecurringIncome(owner,id,Number(payload.months_to_generate||24));return{handled:true,value:{recurrence:await queryOne<Row>('SELECT * FROM recurring_incomes WHERE id=?',[id]),generated} as T}
  }
  if(parts[0]==='recurring-incomes'&&parts[1]){
    const id=Number(parts[1])
    if(parts[2]==='stop'&&method==='POST'){const from=String(url.searchParams.get('from_month')||monthOf(todayLocal()));await execute('UPDATE recurring_incomes SET active=0,end_month=? WHERE id=? AND owner_id=?',[from,id,owner]);let removed=0;if(url.searchParams.get('remove_future')!=='false'){const rows=await queryRows<Row>("SELECT id FROM incomes WHERE owner_id=? AND recurrence_id=? AND substr(expected_date,1,7)>? AND status<>'received'",[owner,id,from]);removed=rows.length;await execute("DELETE FROM incomes WHERE owner_id=? AND recurrence_id=? AND substr(expected_date,1,7)>? AND status<>'received'",[owner,id,from])}return{handled:true,value:{message:'Renda recorrente interrompida',removed} as T}}
    if(method==='PATCH'){await execute('UPDATE recurring_incomes SET description=?,amount=?,expected_day=?,category_id=?,account_id=?,notes=?,start_month=?,end_month=?,active=? WHERE id=? AND owner_id=?',[requiredText(payload,'description','Descrição'),asNumber(payload.amount),Number(payload.expected_day),payload.category_id||null,payload.account_id||null,String(payload.notes||''),String(payload.start_month),payload.end_month||null,boolInt(payload.active??true),id,owner]);const generated=await generateRecurringIncome(owner,id,Number(payload.months_to_generate||24));return{handled:true,value:{recurrence:await queryOne<Row>('SELECT * FROM recurring_incomes WHERE id=?',[id]),generated} as T}}
  }

  if(url.pathname==='/recurring-expenses'&&method==='GET')return{handled:true,value:await queryRows<Row>('SELECT * FROM recurring_expenses WHERE owner_id=? ORDER BY description',[owner]) as T}
  if(parts[0]==='recurring-expenses'&&parts[1]){
    const id=Number(parts[1])
    if(parts[2]==='stop'&&method==='POST'){const from=String(url.searchParams.get('from_month')||monthOf(todayLocal()));await execute('UPDATE recurring_expenses SET active=0,end_month=? WHERE id=? AND owner_id=?',[from,id,owner]);let removed=0;if(url.searchParams.get('remove_future')!=='false'){const rows=await queryRows<Row>("SELECT id FROM expenses WHERE owner_id=? AND recurrence_id=? AND substr(due_date,1,7)>? AND status<>'paid'",[owner,id,from]);removed=rows.length;await execute("DELETE FROM expenses WHERE owner_id=? AND recurrence_id=? AND substr(due_date,1,7)>? AND status<>'paid'",[owner,id,from])}return{handled:true,value:{message:'Despesa recorrente interrompida',removed} as T}}
    if(method==='PATCH'){await execute('UPDATE recurring_expenses SET description=?,amount=?,due_day=?,category_id=?,payment_method=?,merchant=?,account_id=?,start_month=?,end_month=?,active=? WHERE id=? AND owner_id=?',[requiredText(payload,'description','Descrição'),asNumber(payload.amount),Number(payload.due_day),payload.category_id||null,String(payload.payment_method||'pix'),String(payload.merchant||''),payload.account_id||null,String(payload.start_month),payload.end_month||null,boolInt(payload.active??true),id,owner]);const generated=await generateRecurringExpense(owner,id,Number(payload.months_to_generate||24));return{handled:true,value:{recurrence:await queryOne<Row>('SELECT * FROM recurring_expenses WHERE id=?',[id]),generated} as T}}
  }

  return { handled: false }
}
