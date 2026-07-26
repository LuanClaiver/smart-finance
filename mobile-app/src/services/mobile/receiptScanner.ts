export type ReceiptDraft = {
  amount: number | null
  merchant: string
  description: string
  documentDate: string
  paymentMethod: 'pix' | 'debit' | 'cash' | 'transfer' | 'boleto' | 'credit_card'
  categoryHint: string
  notes: string
  rawText: string
  confidence: number
  detectedKind: 'expense' | 'income'
  isLikelyPaid: boolean
}

export type ScannedReceipt = {
  draft: ReceiptDraft
  attachmentFile: File
}

type OCRLoggerMessage = {
  status?: string
  progress?: number
}

type OCRWorker = {
  recognize: (image: HTMLCanvasElement | string | Blob) => Promise<{ data: { text: string; confidence?: number } }>
  terminate: () => Promise<void>
}

type TesseractApi = {
  createWorker: (
    language?: string,
    engineMode?: number,
    options?: { logger?: (message: OCRLoggerMessage) => void },
  ) => Promise<OCRWorker>
}

declare global {
  interface Window {
    Tesseract?: TesseractApi
  }
}

const TESSERACT_SCRIPT_ID = 'smart-finance-tesseract'
const TESSERACT_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function parseBrazilianAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, '')
  if (!cleaned) return null

  let normalized = cleaned
  const comma = normalized.lastIndexOf(',')
  const dot = normalized.lastIndexOf('.')

  if (comma > dot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (dot > comma && comma >= 0) {
    normalized = normalized.replace(/,/g, '')
  } else if (comma >= 0) {
    normalized = normalized.replace(',', '.')
  } else if ((normalized.match(/\./g) || []).length > 1) {
    const last = normalized.lastIndexOf('.')
    normalized = `${normalized.slice(0, last).replace(/\./g, '')}${normalized.slice(last)}`
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0.01 && amount < 100_000_000 ? amount : null
}

function amountCandidates(lines: string[]): Array<{ amount: number; score: number }> {
  const preferred = /\b(VALOR\s+TOTAL|TOTAL\s+A\s+PAGAR|TOTAL\s+PAGO|VALOR\s+PAGO|TOTAL\s+RECEBIDO|VALOR\s+RECEBIDO|TOTAL)\b/
  const secondary = /\b(PAGO|RECEBIDO|CREDITO|DEBITO|PIX|VALOR)\b/
  const rejected = /\b(SUBTOTAL|TROCO|DESCONTO|ECONOMIA|CNPJ|CPF|COO|SAT|CUPOM|ITEM|QTD|QUANTIDADE)\b/
  const numberPattern = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})/g
  const candidates: Array<{ amount: number; score: number }> = []

  lines.forEach((line, lineIndex) => {
    const normalized = normalizeText(line)
    let match: RegExpExecArray | null
    numberPattern.lastIndex = 0
    while ((match = numberPattern.exec(line)) !== null) {
      const amount = parseBrazilianAmount(match[1])
      if (amount === null) continue
      let score = amount / 10_000
      if (preferred.test(normalized)) score += 120
      else if (secondary.test(normalized)) score += 35
      if (/R\$/.test(line)) score += 10
      if (rejected.test(normalized)) score -= 90
      score += Math.min(lineIndex, 30) * 0.15
      candidates.push({ amount, score })
    }
  })

  return candidates.sort((left, right) => right.score - left.score || right.amount - left.amount)
}

function detectMerchant(lines: string[]): string {
  const ignored = /\b(CNPJ|CPF|CUPOM|EXTRATO|COMPROVANTE|DOCUMENTO|AUXILIAR|NOTA\s+FISCAL|CONSUMIDOR|ENDERECO|DATA|HORA|TOTAL|VALOR|PAGAMENTO|AUTORIZACAO|NFC-E|SAT)\b/
  const candidates = lines
    .slice(0, 12)
    .map((line) => line.replace(/[^\p{L}\p{N}&.'’\- ]/gu, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => {
      const normalized = normalizeText(line)
      const letters = (line.match(/\p{L}/gu) || []).length
      const digits = (line.match(/\d/g) || []).length
      return line.length >= 4 && letters >= 4 && digits < letters * 1.2 && !ignored.test(normalized)
    })

  const merchant = candidates[0] || ''
  return merchant.length > 58 ? merchant.slice(0, 58).trim() : merchant
}

function detectDate(text: string): string {
  const matches = text.matchAll(/\b(0?[1-9]|[12]\d|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-]((?:20)?\d{2})\b/g)
  for (const match of matches) {
    const day = Number(match[1])
    const month = Number(match[2])
    let year = Number(match[3])
    if (year < 100) year += 2000
    const candidate = new Date(year, month - 1, day)
    if (candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day) {
      return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    }
  }
  return ''
}

function detectPaymentMethod(normalized: string): ReceiptDraft['paymentMethod'] {
  if (/CARTAO\s+DE\s+CREDITO|CREDITO\s+(?:APROVADO|A\s+VISTA)|VISA\s+CREDITO|MASTERCARD\s+CREDITO/.test(normalized)) return 'credit_card'
  if (/CARTAO\s+DE\s+DEBITO|DEBITO\s+(?:APROVADO|A\s+VISTA)|VISA\s+DEBITO|MASTERCARD\s+DEBITO/.test(normalized)) return 'debit'
  if (/\bPIX\b|PAGAMENTO\s+INSTANTANEO/.test(normalized)) return 'pix'
  if (/\bBOLETO\b|CODIGO\s+DE\s+BARRAS/.test(normalized)) return 'boleto'
  if (/TRANSFERENCIA|TED\b|DOC\b/.test(normalized)) return 'transfer'
  if (/\bDINHEIRO\b|ESPECIE/.test(normalized)) return 'cash'
  return 'pix'
}

function detectCategory(text: string, kind: 'expense' | 'income'): string {
  const normalized = normalizeText(text)
  if (kind === 'income') {
    if (/SALARIO|FOLHA|PAGAMENTO\s+DE\s+SALARIO|PROVENTOS/.test(normalized)) return 'Salário'
    if (/FREELA|FREELANCE|SERVICO|COMISSAO|VENDA/.test(normalized)) return 'Renda extra'
    if (/REEMBOLSO|ESTORNO/.test(normalized)) return 'Reembolso'
    return ''
  }

  const rules: Array<[RegExp, string]> = [
    [/SUPERMERCADO|MERCADO|MERCEARIA|ATACADAO|ASSAI|CARREFOUR|PANIFICADORA|PADARIA|RESTAURANTE|LANCHONETE|IFOOD|ALIMENTO/, 'Alimentação'],
    [/FARMACIA|DROGARIA|HOSPITAL|CLINICA|LABORATORIO|MEDIC|SAUDE/, 'Saúde'],
    [/POSTO|COMBUSTIVEL|GASOLINA|ETANOL|UBER|99\b|TAXI|PASSAGEM|PEDAGIO|ESTACIONAMENTO/, 'Transporte'],
    [/ENERGIA|ELETRICA|AGUA|INTERNET|ALUGUEL|CONDOMINIO|CASA|MORADIA/, 'Moradia'],
    [/ESCOLA|FACULDADE|CURSO|LIVRARIA|PAPELARIA|EDUCACAO/, 'Educação'],
    [/CINEMA|NETFLIX|SPOTIFY|STEAM|PLAYSTATION|XBOX|LAZER|PARQUE/, 'Lazer'],
    [/ROUPA|CALCADO|LOJA|SHOPPING|MAGAZINE|AMAZON|MERCADO\s+LIVRE|SHOPEE/, 'Compras'],
    [/SEGURO|IMPOSTO|IPVA|LICENCIAMENTO|MULTA/, 'Impostos e taxas'],
  ]
  return rules.find(([pattern]) => pattern.test(normalized))?.[1] || ''
}

function detectKind(normalized: string, expectedKind: 'expense' | 'income'): 'expense' | 'income' {
  if (/PIX\s+RECEBIDO|TRANSFERENCIA\s+RECEBIDA|CREDITO\s+EM\s+CONTA|DEPOSITO|VALOR\s+RECEBIDO|RECEBIMENTO/.test(normalized)) return 'income'
  if (/COMPRA|PAGAMENTO\s+EFETUADO|VALOR\s+PAGO|TOTAL\s+A\s+PAGAR|CUPOM|NOTA\s+FISCAL/.test(normalized)) return 'expense'
  return expectedKind
}

function isLikelyCompleted(normalized: string, kind: 'expense' | 'income'): boolean {
  if (kind === 'income') return /RECEBIDO|RECEBIMENTO|CREDITO\s+EM\s+CONTA|DEPOSITO|CONCLUID[AO]|EFETIVAD[AO]/.test(normalized)
  return /PAGO|PAGAMENTO.{0,30}(?:APROVAD[AO]|EFETUAD[AO]|CONCLUID[AO])|COMPRA\s+APROVADA|AUTORIZAD[AO]|CUPOM|NOTA\s+FISCAL/.test(normalized)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível abrir a foto. Tente tirar outra imagem com mais luz.'))
    }
    image.src = url
  })
}

async function preprocessImage(file: File): Promise<HTMLCanvasElement> {
  const image = await loadImage(file)
  const maximumSide = 1800
  const scale = Math.min(1, maximumSide / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('O aparelho não conseguiu preparar a imagem para leitura.')
  context.filter = 'grayscale(1) contrast(1.35)'
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function canvasToAttachmentFile(canvas: HTMLCanvasElement): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Não foi possível preparar a foto para anexar.')), 'image/jpeg', 0.9)
  })
  return new File([blob], `comprovante-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

async function loadTesseract(): Promise<TesseractApi> {
  if (window.Tesseract) return window.Tesseract

  const existing = document.getElementById(TESSERACT_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if (window.Tesseract) return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Não foi possível carregar o leitor de comprovantes. Verifique a internet e tente novamente.')), { once: true })
    })
  } else {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.id = TESSERACT_SCRIPT_ID
      script.src = TESSERACT_SCRIPT_URL
      script.async = true
      script.crossOrigin = 'anonymous'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Não foi possível carregar o leitor de comprovantes. Verifique a internet e tente novamente.'))
      document.head.appendChild(script)
    })
  }

  if (!window.Tesseract) throw new Error('O leitor de comprovantes não iniciou corretamente.')
  return window.Tesseract
}

export function analyzeReceiptText(
  rawText: string,
  expectedKind: 'expense' | 'income',
  confidence = 0,
): ReceiptDraft {
  const cleanedText = rawText.replace(/\r/g, '').trim()
  const lines = cleanedText.split('\n').map((line) => line.trim()).filter(Boolean)
  const normalized = normalizeText(cleanedText)
  const detectedKind = detectKind(normalized, expectedKind)
  const merchant = detectMerchant(lines)
  const amount = amountCandidates(lines)[0]?.amount ?? null
  const documentDate = detectDate(cleanedText)
  const paymentMethod = detectPaymentMethod(normalized)
  const categoryHint = detectCategory(`${merchant}\n${cleanedText}`, expectedKind)
  const isPaid = isLikelyCompleted(normalized, expectedKind)
  const fallbackSubject = expectedKind === 'expense' ? 'uma despesa' : 'um recebimento'
  const description = merchant
    ? expectedKind === 'expense' ? `Compra em ${merchant}` : `Recebimento de ${merchant}`
    : expectedKind === 'expense' ? 'Despesa lida pela câmera' : 'Entrada lida pela câmera'

  if (!cleanedText || (!amount && lines.length < 2)) {
    throw new Error('Não consegui ler dados suficientes. Fotografe o comprovante inteiro, sem reflexo e com boa iluminação.')
  }

  return {
    amount,
    merchant,
    description,
    documentDate,
    paymentMethod,
    categoryHint,
    notes: `Preenchido pela câmera a partir de ${fallbackSubject}. Revise os dados antes de salvar.`,
    rawText: cleanedText,
    confidence: Math.round(confidence || 0),
    detectedKind,
    isLikelyPaid: expectedKind === 'income' ? true : isPaid,
  }
}

function statusLabel(status?: string): string {
  const normalized = normalizeText(status || '')
  if (normalized.includes('LOADING TESSERACT CORE')) return 'Preparando o leitor'
  if (normalized.includes('INITIALIZING TESSERACT')) return 'Iniciando a leitura'
  if (normalized.includes('LOADING LANGUAGE')) return 'Carregando o idioma português'
  if (normalized.includes('INITIALIZING API')) return 'Finalizando a preparação'
  if (normalized.includes('RECOGNIZING TEXT')) return 'Lendo o comprovante'
  return 'Analisando a imagem'
}

export async function scanReceipt(
  file: File,
  expectedKind: 'expense' | 'income',
  onProgress?: (progress: number, label: string) => void,
): Promise<ScannedReceipt> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione ou fotografe uma imagem do comprovante.')
  if (file.size > 25 * 1024 * 1024) throw new Error('A foto é muito grande. Use uma imagem de até 25 MB.')

  onProgress?.(0.03, 'Preparando a foto')
  const image = await preprocessImage(file)
  const attachmentFile = await canvasToAttachmentFile(image)
  const tesseract = await loadTesseract()
  let worker: OCRWorker | null = null

  try {
    worker = await tesseract.createWorker('por', 1, {
      logger: (message) => onProgress?.(Math.max(0.08, Math.min(0.98, message.progress ?? 0.1)), statusLabel(message.status)),
    })
    const result = await worker.recognize(image)
    const draft = analyzeReceiptText(result.data.text, expectedKind, result.data.confidence)

    onProgress?.(1, 'Leitura concluída')
    return { attachmentFile, draft }
  } finally {
    if (worker) await worker.terminate().catch(() => undefined)
  }
}
