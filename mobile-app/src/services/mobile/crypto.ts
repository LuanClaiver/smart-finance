const encoder = new TextEncoder()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((value) => { binary += String.fromCharCode(value) })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function randomToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return bytesToBase64(bytes).replace(/[+/=]/g, '')
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveBits'])
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 }, key, 256)
  return `pbkdf2$210000$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(result))}`
}

export async function verifySecret(secret: string, stored?: string | null): Promise<boolean> {
  if (!stored) return false
  const [algorithm, iterationsText, saltText, hashText] = stored.split('$')
  if (algorithm !== 'pbkdf2' || !iterationsText || !saltText || !hashText) return false
  const iterations = Number(iterationsText)
  const salt = base64ToBytes(saltText)
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveBits'])
  const result = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
  const expected = base64ToBytes(hashText)
  if (result.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < result.length; index += 1) difference |= result[index] ^ expected[index]
  return difference === 0
}

export function decodeJwtPayload<T extends Record<string, unknown>>(token: string): T {
  const part = token.split('.')[1]
  if (!part) throw new Error('Token Google inválido.')
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return JSON.parse(decodeURIComponent(Array.from(atob(padded)).map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))) as T
}
