// Run this before every git push to check for exposed secrets
import * as fs from 'fs';
import * as path from 'path';

const DANGEROUS_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{35}/,     // Google API key pattern
  /ya29\.[0-9A-Za-z\-_]+/,      // OAuth token
  /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/, // OAuth client
];

const FILES_TO_CHECK = [
  'src',
  'firebase-applet-config.json',
  'package.json',
];

function checkPath(itemPath: string): boolean {
  if (!fs.existsSync(itemPath)) return true;
  
  const stat = fs.statSync(itemPath);
  if (stat.isDirectory()) {
    let safe = true;
    const files = fs.readdirSync(itemPath);
    for (const file of files) {
      if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
      const childSafe = checkPath(path.join(itemPath, file));
      if (!childSafe) safe = false;
    }
    return safe;
  } else {
    try {
      const content = fs.readFileSync(itemPath, 'utf-8');
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`EXPOSED SECRET found in: ${itemPath}`);
          return false;
        }
      }
    } catch (err: any) {
      // Ignore reading errors for binary files or other system blocks
    }
    return true;
  }
}

console.log('Checking for exposed secrets...');
let allSafe = true;
FILES_TO_CHECK.forEach(f => {
  if (!checkPath(f)) {
    allSafe = false;
  }
});

if (allSafe) {
  console.log('All clear — no secrets detected');
} else {
  console.error('Fix exposed secrets before pushing!');
  process.exit(1);
}
