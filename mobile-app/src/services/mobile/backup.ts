import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { Share } from '@capacitor/share'
import { closeDb, DATABASE_NAME, getDb, queryRows } from './db'

const TABLES = ['users', 'categories', 'accounts', 'cards', 'incomes', 'recurring_expenses', 'expenses', 'loans', 'loan_installments']
const HISTORY_KEY = 'smart-finance-mobile-backups'

type BackupInfo = { name: string; size: number; created_at: string; uri?: string }

type DownloadResult = { name: string; uri: string; location: string }

type SmartFinanceDownloadsPlugin = {
  saveFile(options: { sourceUri: string; filename: string; mimeType: string }): Promise<DownloadResult>
  validateDatabase(options: { sourceUri: string }): Promise<{ message: string; tables: number }>
  replaceDatabase(options: { sourceUri: string; targetUri?: string; databaseName?: string }): Promise<{ message: string }>
}

const SmartFinanceDownloads = registerPlugin<SmartFinanceDownloadsPlugin>('SmartFinanceDownloads')

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
  let write: { uri: string }
  let location = 'Documentos/SmartFinance'
  try {
    write = await Filesystem.writeFile({ path: `SmartFinance/${filename}`, data: content, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })
  } catch {
    // Alguns aparelhos Android restringem o diretório público Documentos. O
    // backup de segurança não pode impedir uma importação válida, então usamos
    // o armazenamento privado do aplicativo como alternativa segura.
    write = await Filesystem.writeFile({ path: `backups/${filename}`, data: content, directory: Directory.Data, encoding: Encoding.UTF8, recursive: true })
    location = 'armazenamento interno do aplicativo'
  }
  const info: BackupInfo = { name: filename, size: new Blob([content]).size, created_at: createdAt, uri: write.uri }
  const history = [info, ...(await listMobileBackups()).filter((item) => item.name !== filename)].slice(0, 30)
  await Preferences.set({ key: HISTORY_KEY, value: JSON.stringify(history) })
  if (shareAfter) {
    try { await Share.share({ title: 'Backup Smart Finance', text: 'Backup local do Smart Finance', url: write.uri, dialogTitle: 'Salvar ou compartilhar backup' }) } catch { /* arquivo já foi salvo */ }
  }
  return { message: `Backup criado e salvo em ${location}`, name: filename }
}

export async function ensureDailyBackup(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const last = await Preferences.get({ key: 'smart-finance-mobile-last-daily-backup' })
  if (last.value === today) return
  await createMobileBackup(false)
  await Preferences.set({ key: 'smart-finance-mobile-last-daily-backup', value: today })
}

function browserDownloadDatabase(): never {
  throw new Error('A exportação nativa está disponível somente no aplicativo Android.')
}

export async function exportMobileDatabase(): Promise<{ message: string; name: string }> {
  if (!Capacitor.isNativePlatform()) browserDownloadDatabase()

  const database = await getDb()
  const location = await database.getUrl()
  const createdAt = new Date().toISOString()
  const filename = `smart-finance-${createdAt.slice(0, 10)}-${createdAt.slice(11, 19).replace(/:/g, '-')}.db`

  // Fechar a conexão força o SQLite a concluir as gravações pendentes antes da cópia.
  await closeDb()
  try {
    const result = await SmartFinanceDownloads.saveFile({
      sourceUri: location.url,
      filename,
      mimeType: 'application/vnd.sqlite3',
    })
    return { message: `Banco baixado em ${result.location || 'Downloads'}`, name: result.name || filename }
  } finally {
    await getDb()
  }
}


function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    binary += String.fromCharCode(...Array.from(chunk))
  }
  return btoa(binary)
}

function assertSqliteFile(bytes: Uint8Array): void {
  const signature = new TextDecoder('ascii').decode(bytes.subarray(0, 16))
  if (signature !== 'SQLite format 3\u0000') {
    throw new Error('O arquivo selecionado não é um banco SQLite válido.')
  }
}

export async function importMobileDatabase(file: File): Promise<{ message: string; name: string }> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('A importação do banco está disponível somente no aplicativo Android.')
  }
  if (!file.name.toLowerCase().endsWith('.db')) {
    throw new Error('Selecione um arquivo .db compatível exportado pelo Smart Finance.')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  assertSqliteFile(bytes)
  await createMobileBackup(false)

  const temporaryName = `SmartFinance/importacao-${Date.now()}.db`
  const temporary = await Filesystem.writeFile({
    path: temporaryName,
    data: bytesToBase64(bytes),
    directory: Directory.Cache,
    recursive: true,
  })

  // Valida o arquivo pelo próprio SQLite nativo antes de tocar no banco atual.
  // Isso também produz uma mensagem útil quando o arquivo está corrompido ou
  // não pertence ao Smart Finance.
  await SmartFinanceDownloads.validateDatabase({ sourceUri: temporary.uri })

  const database = await getDb()
  const target = await database.getUrl().catch(() => ({ url: '' }))
  await closeDb()

  try {
    await SmartFinanceDownloads.replaceDatabase({
      sourceUri: temporary.uri,
      targetUri: target.url || undefined,
      databaseName: DATABASE_NAME,
    })
    // Não reabra o banco antes do reload. A conexão nativa sobreviveria à
    // recarga do WebView e o novo contexto JavaScript tentaria criá-la outra vez.
    return { message: 'Banco validado e importado. Entre novamente para atualizar a sessão', name: file.name }
  } catch (error) {
    // Se a substituição falhar, restaura o funcionamento da sessão atual.
    await getDb().catch(() => undefined)
    throw error
  } finally {
    await Filesystem.deleteFile({ path: temporaryName, directory: Directory.Cache }).catch(() => undefined)
  }
}
