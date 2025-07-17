import crypto from 'crypto';
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import useragent from 'useragent';

/**
 * Encrypt a string using AES-256-CBC.
 *
 * @param text - Plain text to encrypt.
 * @param password - Password used for key derivation.
 * @param ivString - Initialization vector in hex format.
 * @returns Object containing encrypted data and IV.
 *
 * @example
 * const { encryptedData, iv } = encrypt('hello', 'pass', '');
 * const plain = decrypt(encryptedData, 'pass', iv);
 */
export function encrypt(text: string, password: string, ivString: string) {
  const iv = ivString ? Buffer.from(ivString, 'hex') : crypto.randomBytes(16);
  const key = crypto.scryptSync(password, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encryptedData: encrypted, iv: iv.toString('hex') };
}

/**
 * Decrypt data encrypted with {@link encrypt}.
 *
 * @param encryptedData - The hexadecimal encrypted string.
 * @param password - Password used for key derivation.
 * @param ivString - Initialization vector in hex format.
 * @returns The decrypted plain text.
 */
export function decrypt(encryptedData: string, password: string, ivString: string) {
  const key = crypto.scryptSync(password, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivString, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


/**
 * Generates a unique 6-digit code.
 *
 * @returns A 6-digit code as string.
 *
 * @example
 * const code = generateCode();
 * console.log(code); // "482901"
 */
export function generateCode() {
  const bytes = crypto.randomBytes(4);
  const uint = bytes.readUInt32BE(0);
  const sixDigitCode = uint % 1000000;
  return sixDigitCode.toString().padStart(6, '0');
}

/**
 * Generates a 32-byte key from any given string.
 * @param {string} input - The input string from which to generate the key.
 * @returns {Buffer} A 32-byte Buffer containing the key.
 */
const generateKeyFromInput = (input: string) => {
  // Create a SHA-256 hash of the input
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest(); // This returns a Buffer with the 32-byte hash
};

/**
 * Build a secure token that contains encrypted data.
 *
 * @param data - Payload to include in the token.
 * @param pass - Encryption key.
 * @param ivString - Initialization vector in hex format.
 * @param expiresIn - Expiration time for the JWT.
 * @returns URL-safe encrypted token string.
 *
 * @example
 * const token = buildToken({ payload: { foo: 'bar' } }, 'pass', iv, '1h');
 */
export const buildToken = (data: { payload: any }, pass: string, ivString: string, expiresIn: string) => {
  // Encrypt the JSON content
  const key_in_bytes = generateKeyFromInput(pass);
  const cipher = crypto.createCipheriv('aes-256-cbc', key_in_bytes, Buffer.from(ivString, 'hex'));
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Generate the JWT token
  const token = jwt.sign({ payload: encrypted }, pass, { expiresIn });

  // Make the token URL-safe
  return encodeURIComponent(token);
}

/**
 * Decrypt a token created with {@link buildToken}.
 *
 * @param encryptedToken - The encrypted token.
 * @param pass - Decryption key.
 * @param ivString - Initialization vector in hex format.
 * @returns The decrypted payload or an Error instance.
 */
export const readToken = (encryptedToken: string, pass: string, ivString: string) => {
  try {
    // Decode the token first if it is URL-encoded
    const token = decodeURIComponent(encryptedToken);

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, pass);

    if (typeof decoded !== 'object') {
      throw new Error("decoded data is not an object, spect an object:\n" + decoded);
    }

    // Decrypt the payload
    const key_in_bytes = generateKeyFromInput(pass);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key_in_bytes, Buffer.from(ivString, 'hex'));
    let decrypted = decipher.update(decoded.payload, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Parse the decrypted content to an object
    const parsed = JSON.parse(decrypted);

    return parsed;
  } catch (err) {
    return err;
  }
};

/**
 * Generate a bcrypt hash from a plain password.
 *
 * @param password - Password to hash.
 * @returns The hashed password or an Error.
 *
 * @example
 * const hash = await generatePasswordHash('secret');
 */
export async function generatePasswordHash(password: string) {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    return error;
  }
}

/**
 * Verify a password against a bcrypt hash.
 *
 * @param password - Plain password to verify.
 * @param hash - Previously generated hash.
 * @returns True if the password matches, otherwise false or an Error.
 */
export async function verifyPasswordHash(password: string, hash: string) {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    return error;
  }
}

/**
 * Determine the client family from a user-agent string.
 *
 * @param userAgent - Raw user-agent header string.
 * @param device - Optional device hint.
 * @returns The detected client family (e.g. 'Chrome').
 */
export function getClientType(userAgent: string, device?: string) {
  const agent = useragent.parse(userAgent);
  return agent.family;
}

export default {
  buildToken,
  readToken,
  generatePasswordHash,
  verifyPasswordHash,
  getClientType
};
