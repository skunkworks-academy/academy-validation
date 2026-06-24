import { readFileSync } from 'node:fs';
const rules = JSON.parse(readFileSync('rules/required-sites.json', 'utf8'));
console.log('Loaded ' + rules.length + ' validation rule groups.');
