import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { Share } from '@capacitor/share'
import { queryRows } from './db'

const TABLES = ['users', 'categories', 'accounts', 'cards', 'incomes', 'recurring_expenses', 'expenses', 'loans', 'loan_installments']
const HISTORY_KEY = 'smart-finance-mobile-backups'

type BackupInfo = { name: string; size: number; created_at: string; uri?: string }

export async function listMobileBackups(): Promise<BackupInfo[]> {
  const result = await Preferences.get({ key: HISTORY_KEY })
  try { return result.value ? JSON.parse(result.value) as BackupInfo[] : [] } catch { return [] }
}

export async function createMobileBackup(shareAfter = true): Promise<{ message: string; name: string }> {
  const data: Record<string, unknown[]> = {}
  for (const table of TABLES) data[table] = await queryRows<Record<string, unknown>>(`SELECT * FROM ${table}`)
  const createdAt = new Date().toISOString()
  const filename = `smart-finance-mobile-${createdAt.slice(0, 10)}-${createdAt.slice(11, 19).replace(/:/g, '-')}.json`
  const content = JSON.stringify({ format: 'smart-finance-mobile', version: 1, created_at: createdAt, data }, null, 2)
  const write = await Filesystem.writeFile({ path: `SmartFinance/${filename}`, data: content, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })
  const info: BackupInfo = { name: filename, size: new Blob([content]).size, created_at: createdAt, uri: write.uri }
  const history = [info, ...(await listMobileBackups()).filter((item) => item.name !== filename)].slice(0, 30)
  await Preferences.set({ key: HISTORY_KEY, value: JSON.stringify(history) })
  if (shareAfter) {
    try { await Share.share({ title: 'Backup Smart Finance', text: 'Backup local do Smart Finance', url: write.uri, dialogTitle: 'Salvar ou compartilhar backup' }) } catch { /* arquivo já foi salvo */ }
  }
  return { message: 'Backup criado e salvo em Documentos/SmartFinance', name: filename }
}

export async function ensureDailyBackup(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const last = await Preferences.get({ key: 'smart-finance-mobile-last-daily-backup' })
  if (last.value === today) return
  await createMobileBackup(false)
  await Preferences.set({ key: 'smart-finance-mobile-last-daily-backup', value: today })
}
