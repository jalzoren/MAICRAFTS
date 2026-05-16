import crypto from 'crypto';

// Ensure ENCRYPTION_KEY exists before importing the encryption utilities
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  console.log('No ENCRYPTION_KEY found — generated temporary key for test.');
}

import { encrypt, decrypt } from '../utils/encryption.js';

async function runTests() {
  const samples = [
    '09171234567',
    '+63 917 123 4567',
    'CustomChars!@#$%^&*()_+',
    '',
    null,
  ];

  let failures = 0;

  for (const s of samples) {
    try {
      const enc = encrypt(s);
      const dec = decrypt(enc);

      const expected = (s === null || (typeof s === 'string' && s.trim() === '')) ? null : s;

      if (expected === null) {
        if (dec !== null) {
          console.error(`FAIL: expected null for input ${String(s)}, got '${dec}'`);
          failures++;
        } else {
          console.log(`OK: input ${String(s)} -> null`);
        }
      } else {
        if (dec !== expected) {
          console.error(`FAIL: roundtrip mismatch for '${s}' -> '${dec}'`);
          failures++;
        } else {
          console.log(`OK: '${s}' -> '${enc?.slice(0,16)}...'`);
        }
      }
    } catch (err) {
      console.error('ERROR for sample', s, err && err.message ? err.message : err);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`${failures} test(s) failed`);
    process.exit(1);
  }

  console.log('All roundtrip tests passed');
  process.exit(0);
}

runTests();
