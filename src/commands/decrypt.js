'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { resolvePath } = require('../utils/pathResolver');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const MAGIC = 'Salted__';

/**
 * Decrypt a file previously encrypted with the `encrypt` command (AES-256-CBC).
 *
 * Usage: decrypt <input> <output> <passphrase>
 *
 * @param {string[]} args       - [inputPath, outputPath, passphrase]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {string} Result message.
 */
function decrypt(args, currentDir) {
  if (args.length < 3) {
    return 'Usage: decrypt <input> <output> <passphrase>';
  }

  const inputPath = resolvePath(currentDir, args[0]);
  const outputPath = resolvePath(currentDir, args[1]);
  const passphrase = args[2];

  let data;
  try {
    data = fs.readFileSync(inputPath);
  } catch (err) {
    return `decrypt: cannot read file: ${err.message}`;
  }

  if (data.length < MAGIC.length + 8 + IV_LENGTH) {
    return 'decrypt: file is too short or not a valid encrypted file';
  }

  const magic = data.slice(0, 8).toString('utf8');
  if (magic !== MAGIC) {
    return 'decrypt: file does not appear to be an encrypted file (missing header)';
  }

  const salt = data.slice(8, 16);
  const iv = data.slice(16, 16 + IV_LENGTH);
  const ciphertext = data.slice(16 + IV_LENGTH);

  let key;
  try {
    key = crypto.scryptSync(passphrase, salt, KEY_LENGTH);
  } catch (err) {
    return `decrypt: key derivation failed: ${err.message}`;
  }

  let plaintext;
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return 'decrypt: decryption failed — wrong passphrase or corrupted file';
  }

  try {
    fs.writeFileSync(outputPath, plaintext);
  } catch (err) {
    return `decrypt: cannot write file: ${err.message}`;
  }

  return `decrypt: file decrypted → ${outputPath}`;
}

module.exports = { decrypt };
