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
execSync(
  `npx staticrypt "${internalHtmlPath}" ${password} -o "${internalHtmlPath}" -t ./scripts/password-template.html --short`,
  {
    stdio: 'inherit'
  }
);

console.log('Encryption complete!');
