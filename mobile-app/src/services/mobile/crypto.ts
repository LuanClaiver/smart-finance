const encoder = new TextEncoder()

const PBKDF2_ITERATIONS = 210_000
const SCRYPT_N = 16_384
const SCRYPT_R = 8
const SCRYPT_P = 1

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((value) => { binary += String.fromCharCode(value) })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function pbkdf2(secret: string, salt: Uint8Array, iterations: number, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveBits'])
  const result = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    length * 8,
  )
  return new Uint8Array(result)
}

function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0
}

function add(a: number, b: number): number {
  return (a + b) >>> 0
}

function salsa208(input: Uint32Array): Uint32Array {
  const x = new Uint32Array(input)

  for (let round = 0; round < 8; round += 2) {
    x[4] ^= rotl(add(x[0], x[12]), 7)
    x[8] ^= rotl(add(x[4], x[0]), 9)
    x[12] ^= rotl(add(x[8], x[4]), 13)
    x[0] ^= rotl(add(x[12], x[8]), 18)

    x[9] ^= rotl(add(x[5], x[1]), 7)
    x[13] ^= rotl(add(x[9], x[5]), 9)
    x[1] ^= rotl(add(x[13], x[9]), 13)
    x[5] ^= rotl(add(x[1], x[13]), 18)

    x[14] ^= rotl(add(x[10], x[6]), 7)
    x[2] ^= rotl(add(x[14], x[10]), 9)
    x[6] ^= rotl(add(x[2], x[14]), 13)
    x[10] ^= rotl(add(x[6], x[2]), 18)

    x[3] ^= rotl(add(x[15], x[11]), 7)
    x[7] ^= rotl(add(x[3], x[15]), 9)
    x[11] ^= rotl(add(x[7], x[3]), 13)
    x[15] ^= rotl(add(x[11], x[7]), 18)

    x[1] ^= rotl(add(x[0], x[3]), 7)
    x[2] ^= rotl(add(x[1], x[0]), 9)
    x[3] ^= rotl(add(x[2], x[1]), 13)
    x[0] ^= rotl(add(x[3], x[2]), 18)

    x[6] ^= rotl(add(x[5], x[4]), 7)
    x[7] ^= rotl(add(x[6], x[5]), 9)
    x[4] ^= rotl(add(x[7], x[6]), 13)
    x[5] ^= rotl(add(x[4], x[7]), 18)

    x[11] ^= rotl(add(x[10], x[9]), 7)
    x[8] ^= rotl(add(x[11], x[10]), 9)
    x[9] ^= rotl(add(x[8], x[11]), 13)
    x[10] ^= rotl(add(x[9], x[8]), 18)

    x[12] ^= rotl(add(x[15], x[14]), 7)
    x[13] ^= rotl(add(x[12], x[15]), 9)
    x[14] ^= rotl(add(x[13], x[12]), 13)
    x[15] ^= rotl(add(x[14], x[13]), 18)
  }

  const output = new Uint32Array(16)
  for (let index = 0; index < 16; index += 1) output[index] = add(x[index], input[index])
  return output
}

function bytesToWordsLE(bytes: Uint8Array): Uint32Array {
  const words = new Uint32Array(bytes.length >>> 2)
  for (let index = 0; index < words.length; index += 1) {
    const offset = index * 4
    words[index] = (
      bytes[offset]
      | (bytes[offset + 1] << 8)
      | (bytes[offset + 2] << 16)
      | (bytes[offset + 3] << 24)
    ) >>> 0
  }
  return words
}

function wordsToBytesLE(words: Uint32Array): Uint8Array {
  const bytes = new Uint8Array(words.length * 4)
  for (let index = 0; index < words.length; index += 1) {
    const value = words[index]
    const offset = index * 4
    bytes[offset] = value & 0xff
    bytes[offset + 1] = (value >>> 8) & 0xff
    bytes[offset + 2] = (value >>> 16) & 0xff
    bytes[offset + 3] = (value >>> 24) & 0xff
  }
  return bytes
}

function blockMixSalsa8(block: Uint32Array, r: number): Uint32Array {
  const chunks = 2 * r
  let x = block.slice((chunks - 1) * 16, chunks * 16)
  const y = new Uint32Array(block.length)

  for (let index = 0; index < chunks; index += 1) {
    const offset = index * 16
    const mixed = new Uint32Array(16)
    for (let word = 0; word < 16; word += 1) mixed[word] = x[word] ^ block[offset + word]
    x = salsa208(mixed)
    y.set(x, offset)
  }

  const output = new Uint32Array(block.length)
  for (let index = 0; index < r; index += 1) {
    output.set(y.subarray((index * 2) * 16, (index * 2 + 1) * 16), index * 16)
    output.set(y.subarray((index * 2 + 1) * 16, (index * 2 + 2) * 16), (index + r) * 16)
  }
  return output
}

function romix(blockBytes: Uint8Array, n: number, r: number): Uint8Array {
  let x = bytesToWordsLE(blockBytes)
  const blockWords = x.length
  const v = new Uint32Array(n * blockWords)

  for (let index = 0; index < n; index += 1) {
    v.set(x, index * blockWords)
    x = blockMixSalsa8(x, r)
  }

  const scratch = new Uint32Array(blockWords)
  const integerifyOffset = (2 * r - 1) * 16
  for (let index = 0; index < n; index += 1) {
    const j = x[integerifyOffset] & (n - 1)
    const vOffset = j * blockWords
    for (let word = 0; word < blockWords; word += 1) scratch[word] = x[word] ^ v[vOffset + word]
    x = blockMixSalsa8(scratch, r)
  }

  return wordsToBytesLE(x)
}

async function scryptLegacy(secret: string, salt: Uint8Array, n: number, r: number, p: number, length: number): Promise<Uint8Array> {
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) throw new Error('Parâmetros scrypt não suportados')
  const initial = await pbkdf2(secret, salt, 1, p * 128 * r)
  const mixed = new Uint8Array(initial.length)
  const chunkSize = 128 * r
  for (let index = 0; index < p; index += 1) {
    mixed.set(romix(initial.subarray(index * chunkSize, (index + 1) * chunkSize), n, r), index * chunkSize)
  }
  return pbkdf2(secret, mixed, 1, length)
}

function constantTimeEqual(actual: Uint8Array, expected: Uint8Array): boolean {
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index]
  return difference === 0
}

export function randomToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return bytesToBase64(bytes).replace(/[+/=]/g, '')
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const result = await pbkdf2(secret, salt, PBKDF2_ITERATIONS, 32)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(result)}`
}

export function secretHashAlgorithm(stored?: string | null): string | null {
  if (!stored) return null
  return stored.split('$', 1)[0]?.toLowerCase() || null
}

export async function verifySecret(secret: string, stored?: string | null): Promise<boolean> {
  if (!stored) return false
  try {
    const parts = stored.split('$')
    const algorithm = parts[0]?.toLowerCase()

    if (algorithm === 'pbkdf2' && parts.length === 4) {
      const iterations = Number(parts[1])
      if (!Number.isInteger(iterations) || iterations <= 0 || iterations > 5_000_000) return false
      const salt = base64ToBytes(parts[2])
      const expected = base64ToBytes(parts[3])
      const result = await pbkdf2(secret, salt, iterations, expected.length)
      return constantTimeEqual(result, expected)
    }

    // Compatibilidade com contas criadas no programa Windows até a 0.5.1.
    // Esse formato usa scrypt N=16384, r=8, p=1 e é regravado em PBKDF2
    // automaticamente depois do primeiro login correto no APK.
    if (algorithm === 'scrypt' && parts.length === 3) {
      const salt = base64ToBytes(parts[1])
      const expected = base64ToBytes(parts[2])
      const result = await scryptLegacy(secret, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P, expected.length)
      return constantTimeEqual(result, expected)
    }

    return false
  } catch {
    return false
  }
}
