import { readFileSync } from 'node:fs';

const sourceKey = process.argv[2];
if (!sourceKey) {
  console.error('Usage: node scripts/resolve-approved-upstream-image.mjs <source-key>');
  process.exit(2);
}

const policyUrl = new URL('../rules/approved-upstream-images.json', import.meta.url);
const policy = JSON.parse(readFileSync(policyUrl, 'utf8'));
const source = policy.images?.[sourceKey];

if (!source) {
  console.error(`Unapproved upstream image source key: ${sourceKey}`);
  process.exit(3);
}

process.stdout.write(source);
