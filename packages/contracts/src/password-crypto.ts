export interface PasswordScryptParameters {
  n: number
  r: number
  p: number
  keyLength: number
  maxMemoryBytes: number
}

export interface PasswordEncryptedPayload {
  nonce: Uint8Array
  ciphertext: Uint8Array
  tag: Uint8Array
}

export interface PasswordCryptoPort {
  randomBytes(length: number): Uint8Array
  randomInt(maxExclusive: number): number
  deriveScryptKey(
    password: string,
    salt: Uint8Array,
    parameters: PasswordScryptParameters
  ): Promise<Uint8Array>
  encryptAes256Gcm(
    plaintext: Uint8Array,
    key: Uint8Array,
    aad: Uint8Array
  ): PasswordEncryptedPayload
  decryptAes256Gcm(payload: PasswordEncryptedPayload, key: Uint8Array, aad: Uint8Array): Uint8Array
  timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean
}
