const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const password = process.env.STATICRYPT_PASSWORD;
const outDir = './out';

if (!password) {
  console.error('STATICRYPT_PASSWORD environment variable is required');
  process.exit(1);
}

console.log('Starting encryption of internal page...');

// Only encrypt the internal/index.html file
const internalHtmlPath = path.join(outDir, 'internal', 'index.html');

if (!fs.existsSync(internalHtmlPath)) {
  console.error('Internal page not found at:', internalHtmlPath);
  process.exit(1);
}

console.log('Encrypting:', internalHtmlPath);

// Encrypt only the internal page
// staticrypt will automatically use STATICRYPT_PASSWORD env var
execSync(
  `npx staticrypt "${internalHtmlPath}" -o "${internalHtmlPath}" -d "${outDir}/internal" -t ./scripts/password-template.html --short`,
  {
    stdio: 'inherit'
  }
);

console.log('Encryption complete!');

// Clean up the default 'encrypted' directory if it was created
const encryptedDir = './encrypted';
if (fs.existsSync(encryptedDir)) {
  console.log('Cleaning up temporary encrypted directory...');
  fs.rmSync(encryptedDir, { recursive: true, force: true });
}
