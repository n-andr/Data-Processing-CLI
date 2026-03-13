'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { resolvePath } = require('../utils/pathResolver');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // bytes for AES-256
const IV_LENGTH = 16;  // bytes for AES CBC IV

/**
 * Encrypt a file using AES-256-CBC.
 *
 * Usage: encrypt <input> <output> <passphrase>
 *
 * The output file contains a header with the salt and IV followed by the
 * cipher-text so that the file is self-contained for decryption.
 *
 * Layout: "Salted__" (8 bytes) + salt (8 bytes) + IV (16 bytes) + ciphertext
 *
 * @param {string[]} args       - [inputPath, outputPath, passphrase]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {string} Result message.
 */
function encrypt(args, currentDir) {
  if (args.length < 3) {
    return 'Usage: encrypt <input> <output> <passphrase>';
  }

  const inputPath = resolvePath(currentDir, args[0]);
  const outputPath = resolvePath(currentDir, args[1]);
  const passphrase = args[2];

  let plaintext;
  try {
    plaintext = fs.readFileSync(inputPath);
  } catch (err) {
    return `encrypt: cannot read file: ${err.message}`;
  }

  const salt = crypto.randomBytes(8);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(passphrase, salt, KEY_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const header = Buffer.concat([Buffer.from('Salted__'), salt, iv]);
  const output = Buffer.concat([header, encrypted]);

  try {
    fs.writeFileSync(outputPath, output);
  } catch (err) {
    return `encrypt: cannot write file: ${err.message}`;
  }

  return `encrypt: file encrypted → ${outputPath}`;
}

module.exports = { encrypt };
