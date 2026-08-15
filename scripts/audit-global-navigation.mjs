import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const workspace = process.argv[2] || process.cwd();
const rulesPath = new URL('../rules/global-navigation.json', import.meta.url);
const rules = JSON.parse(readFileSync(rulesPath, 'utf8'));
const failures = [];
const warnings = [];

function isIgnored(path) {
  const normalized = path.replaceAll('\\', '/');
  return rules.ignoredPaths.some((rule) => {
    if (rule.startsWith('*.')) return normalized.endsWith(rule.slice(1));
    return normalized.includes(rule.replace('*', ''));
  });
}

function walk(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const absolute = join(dir, name);
    const rel = relative(workspace, absolute).replaceAll('\\', '/');
    if (isIgnored(rel)) continue;
    const stat = statSync(absolute);
    if (stat.isDirectory()) files.push(...walk(absolute));
    else if (/\.(html|htm|tsx|jsx|js|mjs)$/i.test(name)) files.push(absolute);
  }
  return files;
}

function containsAny(content, patterns = []) {
  return patterns.some((pattern) => content.includes(pattern));
}

for (const file of walk(workspace)) {
  const rel = relative(workspace, file).replaceAll('\\', '/');
  const content = readFileSync(file, 'utf8');
  const looksLikePage = /\.(html|htm|tsx|jsx)$/i.test(rel);
  const hasLocalHeader = containsAny(content, rules.blockedLocalHeaderPatterns);
  const hasLocalFooter = containsAny(content, rules.blockedLocalFooterPatterns);
  const referencesCanonicalAsset = content.includes('academy-navigation.js');
  const referencesCanonicalUi = content.includes('skunkworks-ui.js');
  const referencesCanonicalFooter = content.includes('skunkworks-footer.js');
  const hasCanonicalHeader = content.includes(rules.canonicalHeaderAttribute);
  const hasCompatibilityClass = content.includes('swa-has-global-nav');
  const hasCanonicalFooter = content.includes(rules.canonicalFooterAttribute) || content.includes('swa-global-footer');
  const preservesFooter = content.includes('data-sk-preserve-footer');

  if (looksLikePage && hasLocalHeader && !referencesCanonicalAsset && !hasCanonicalHeader && !hasCompatibilityClass) {
    failures.push(`${rel}: local header/navigation detected without canonical global navigation reference.`);
  }

  if (looksLikePage && hasLocalFooter && !referencesCanonicalAsset && !referencesCanonicalFooter && !hasCanonicalFooter && !preservesFooter) {
    failures.push(`${rel}: local public footer detected without canonical global footer reference.`);
  }

  if (looksLikePage && referencesCanonicalUi && !referencesCanonicalAsset && !referencesCanonicalFooter && !hasCanonicalFooter) {
    failures.push(`${rel}: canonical UI is loaded directly without the canonical footer. Use academy-navigation.js or add skunkworks-footer.js.`);
  }

  if (referencesCanonicalAsset && !content.includes(rules.version)) {
    warnings.push(`${rel}: canonical navigation asset referenced without current cache key v=${rules.version}.`);
  }

  if (referencesCanonicalFooter && !content.includes(rules.version)) {
    warnings.push(`${rel}: canonical footer asset referenced without current cache key v=${rules.version}.`);
  }
}

if (warnings.length) {
  console.warn('Global shell audit warnings:\n');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('Global shell audit failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Global navigation and footer audit passed.');
