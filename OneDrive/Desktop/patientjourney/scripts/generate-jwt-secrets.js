#!/usr/bin/env node

/**
 * Generate JWT Secrets for Production
 * 
 * Usage:
 *   node scripts/generate-jwt-secrets.js
 * 
 * This script generates secure random strings for JWT_SECRET and JWT_REFRESH_SECRET
 * that are suitable for production use.
 */

const crypto = require('crypto');

/**
 * Generate a secure random string
 * @param {number} length - Length of the string (default: 64)
 * @returns {string} Random hexadecimal string
 */
function generateSecret(length = 64) {
  // Generate random bytes and convert to hex
  // Each byte = 2 hex characters, so we need length/2 bytes
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').substring(0, length);
}

/**
 * Generate a longer secret (128 characters)
 * @returns {string} Random hexadecimal string
 */
function generateLongSecret() {
  const bytes = crypto.randomBytes(64); // 64 bytes = 128 hex characters
  return bytes.toString('hex');
}

console.log('\n🔐 Generating JWT Secrets for Production\n');
console.log('=' .repeat(60));

// Generate JWT_SECRET (64 characters minimum, but we'll use 128 for extra security)
const jwtSecret = generateLongSecret();
const jwtRefreshSecret = generateLongSecret();

console.log('\n✅ Generated Secrets:\n');
console.log('JWT_SECRET:');
console.log(jwtSecret);
console.log(`\nLength: ${jwtSecret.length} characters`);

console.log('\n' + '-'.repeat(60));

console.log('\nJWT_REFRESH_SECRET:');
console.log(jwtRefreshSecret);
console.log(`\nLength: ${jwtRefreshSecret.length} characters`);

console.log('\n' + '='.repeat(60));
console.log('\n📋 Copy these values to Vercel Dashboard:\n');
console.log('1. Go to: https://vercel.com');
console.log('2. Select your project → Settings → Environment Variables');
console.log('3. Add each variable:\n');

console.log('   Name: JWT_SECRET');
console.log(`   Value: ${jwtSecret}`);
console.log('   Environment: ✅ Production, ✅ Preview, ✅ Development\n');

console.log('   Name: JWT_REFRESH_SECRET');
console.log(`   Value: ${jwtRefreshSecret}`);
console.log('   Environment: ✅ Production, ✅ Preview, ✅ Development\n');

console.log('='.repeat(60));
console.log('\n⚠️  IMPORTANT:');
console.log('   - Keep these secrets secure!');
console.log('   - Never commit them to Git');
console.log('   - Use different secrets for each environment');
console.log('   - Store them only in Vercel Dashboard\n');

// Also output in .env format for easy copy-paste
console.log('\n📄 Format for .env.local (for reference only):\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
console.log('\n');

