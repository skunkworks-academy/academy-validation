import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const targetRoot = args.find((arg) => !arg.startsWith('--')) ?? process.cwd();
const reportOnly = args.includes('--report-only');
const jsonPath = valueAfter('--json') ?? 'registry-audit.json';
const markdownPath = valueAfter('--markdown') ?? 'registry-audit.md';

const authority = 'ghcr.io';
const allowedPackageHosts = new Set([
  'ghcr.io',
  'npm.pkg.github.com',
  'maven.pkg.github.com',
  'nuget.pkg.github.com'
]);

const legacySecrets = [
  'DOCKER_HUB_TOKEN', 'DOCKERHUB_TOKEN', 'DOCKERHUB_USERNAME',
  'ECR_REGISTRY', 'ECR_REPOSITORY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  'GCP_ARTIFACT_REGISTRY_KEY', 'GOOGLE_APPLICATION_CREDENTIALS',
  'ACR_USERNAME', 'ACR_PASSWORD', 'NEXUS_USERNAME', 'NEXUS_PASSWORD',
  'ARTIFACTORY_USERNAME', 'ARTIFACTORY_PASSWORD'
];

const foreignHostPatterns = [
  /\bdocker\.io\b/i,
  /\bindex\.docker\.io\b/i,
  /\bregistry-1\.docker\.io\b/i,
  /\bquay\.io\b/i,
  /\bgcr\.io\b/i,
  /\b[a-z0-9.-]+\.pkg\.dev\b/i,
  /\b[a-z0-9.-]+\.azurecr\.io\b/i,
  /\bregistry\.gitlab\.com\b/i,
  /\b[a-z0-9.-]+\.dkr\.ecr\.[a-z0-9.-]+\.amazonaws\.com\b/i,
  /\b[a-z0-9.-]*nexus[a-z0-9.-]*\b/i,
  /\b[a-z0-9.-]*artifactory[a-z0-9.-]*\b/i
];

const rawCredentialPatterns = [
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/
];

const ignoredDirs = new Set([
  '.git', 'node_modules', 'vendor', 'dist', 'build', 'coverage', '.next', '.cache',
  '.academy-validation', '.work', 'artifacts'
]);

const results = [];
const filesScanned = [];

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

function isRelevant(path) {
  const p = path.replaceAll('\\', '/').toLowerCase();
  const name = basename(p);
  const extension = extname(p);

  if (p.startsWith('.github/workflows/')) return /\.ya?ml$/.test(p);
  if (['.npmrc', 'pom.xml', 'nuget.config', 'package.json', 'chart.yaml'].includes(name)) return true;
  if (/^dockerfile(?:\..+)?$/.test(name)) return true;
  if (/^(docker-)?compose(?:\..+)?\.ya?ml$/.test(name)) return true;
  if (/^values(?:\..+)?\.ya?ml$/.test(name)) return true;
  if (/^build\.gradle(?:\.kts)?$/.test(name) || /^settings\.gradle(?:\.kts)?$/.test(name)) return true;
  if (['.tf', '.tfvars'].includes(extension)) return true;

  return /(^|\/)(manifests?|k8s|kubernetes|helm|charts|deploy|deployment|infra|terraform)(\/|$)/.test(p)
    && ['.yaml', '.yml', '.json', '.tf', '.tfvars'].includes(extension);
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      const rel = relative(targetRoot, full).split(sep).join('/');
      if (isRelevant(rel)) auditFile(rel, readFileSync(full, 'utf8'));
    }
  }
}

function add(file, line, severity, rule, message, sample) {
  results.push({ file, line, severity, rule, message, sample: sample?.trim().slice(0, 240) ?? '' });
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function auditFile(file, content) {
  filesScanned.push(file);
  const normalized = file.replaceAll('\\', '/');
  const lower = normalized.toLowerCase();
  const lines = content.split(/\r?\n/);

  for (const pattern of foreignHostPatterns) {
    for (const match of content.matchAll(new RegExp(pattern.source, 'ig'))) {
      add(file, lineNumber(content, match.index), 'error', 'foreign-registry',
        `Non-authoritative registry host found; publish and deployment targets must use ${authority} or a protocol-specific GitHub Packages endpoint.`,
        lines[lineNumber(content, match.index) - 1]);
    }
  }

  for (const secret of legacySecrets) {
    const regex = new RegExp(`\\b${secret}\\b`, 'g');
    for (const match of content.matchAll(regex)) {
      add(file, lineNumber(content, match.index), 'error', 'legacy-registry-secret',
        `Legacy registry credential reference ${secret} found. Migrate to secrets.GITHUB_TOKEN or secrets.ORG_PACKAGE_REGISTRY_PAT and remove the old secret after cutover.`,
        lines[lineNumber(content, match.index) - 1]);
    }
  }

  for (const pattern of rawCredentialPatterns) {
    for (const match of content.matchAll(new RegExp(pattern.source, 'g'))) {
      add(file, lineNumber(content, match.index), 'error', 'hardcoded-credential',
        'Hardcoded credential material found. Rotate it immediately and replace it with a GitHub secret reference.',
        lines[lineNumber(content, match.index) - 1]);
    }
  }

  if (lower.startsWith('.github/workflows/')) {
    auditWorkflow(file, lines);
  }

  if (/dockerfile/i.test(basename(file))) {
    auditDockerfile(file, lines);
  }

  if (/\.ya?ml$/i.test(file)) {
    auditManifestImages(file, lines);
  }

  if (basename(lower) === '.npmrc' || basename(lower) === 'package.json') {
    auditNpm(file, content, lines);
  }

  if (basename(lower) === 'pom.xml' || /build\.gradle/.test(basename(lower))) {
    auditJvmPublishing(file, content, lines);
  }
}

function auditWorkflow(file, lines) {
  let loginAction = false;
  let loginRegistry = null;
  let loginUsername = null;
  let loginPassword = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 1;

    if (/uses:\s*docker\/login-action@/i.test(line)) {
      loginAction = true;
      loginRegistry = loginUsername = loginPassword = null;
      continue;
    }

    if (loginAction) {
      const registry = line.match(/^\s*registry:\s*([^#\s]+)/i)?.[1];
      const username = line.match(/^\s*username:\s*(.+)$/i)?.[1]?.trim();
      const password = line.match(/^\s*password:\s*(.+)$/i)?.[1]?.trim();
      if (registry) loginRegistry = registry.replace(/["']/g, '');
      if (username) loginUsername = username;
      if (password) loginPassword = password;
      if (/^\s*-\s+name:|^\s*-\s+uses:|^\s*-\s+run:/i.test(line) && !/docker\/login-action@/i.test(line)) {
        validateLogin(file, n, loginRegistry, loginUsername, loginPassword, lines[Math.max(0, i - 1)]);
        loginAction = false;
      }
    }

    const push = line.match(/\bdocker\s+push\s+([^\s]+)/i);
    if (push && !push[1].replace(/["']/g, '').startsWith(`${authority}/`)) {
      add(file, n, 'error', 'foreign-docker-push', `docker push target must start with ${authority}/.`, line);
    }

    const helm = line.match(/\bhelm\s+push\b.*\s(oci:\/\/[^\s]+)/i);
    if (helm && !helm[1].startsWith(`oci://${authority}/`)) {
      add(file, n, 'error', 'foreign-helm-push', `Helm OCI pushes must target oci://${authority}/.`, line);
    }

    if (/\bnpm\s+publish\b/i.test(line) && !/npm\.pkg\.github\.com/i.test(line)) {
      add(file, n, 'warning', 'npm-publish-target',
        'npm publish must resolve to https://npm.pkg.github.com through --registry, publishConfig, or .npmrc.', line);
    }
  }

  if (loginAction) validateLogin(file, lines.length, loginRegistry, loginUsername, loginPassword, lines.at(-1));
}

function validateLogin(file, line, registry, username, password, sample) {
  if (registry && registry !== authority) {
    add(file, line, 'error', 'login-registry', `docker/login-action must authenticate only to ${authority}.`, sample);
  }
  if (username && !/github\.actor/.test(username)) {
    add(file, line, 'error', 'login-username', 'GHCR login username must use ${{ github.actor }}.', sample);
  }
  if (password && !/(secrets\.GITHUB_TOKEN|secrets\.ORG_PACKAGE_REGISTRY_PAT|github\.token)/.test(password)) {
    add(file, line, 'error', 'login-password', 'GHCR login password must use GITHUB_TOKEN or ORG_PACKAGE_REGISTRY_PAT.', sample);
  }
}

function auditDockerfile(file, lines) {
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*FROM\s+(?:--platform=\S+\s+)?([^\s]+)(?:\s+AS\s+\S+)?/i);
    if (!match) continue;
    const image = match[1];
    if (image.toLowerCase() === 'scratch') continue;
    if (!image.startsWith(`${authority}/`)) {
      add(file, i + 1, 'error', 'base-image-registry',
        `Base image ${image} is not sourced from ${authority}. Mirror approved base images into GHCR before production use.`,
        lines[i]);
    }
  }
}

function auditManifestImages(file, lines) {
  const looksDeployable = /(^|\/)(manifests?|k8s|kubernetes|helm|charts|deploy|deployment|infra)(\/|$)/i.test(file)
    || /(?:^|\/)(values|compose|docker-compose)[^/]*\.ya?ml$/i.test(file);
  if (!looksDeployable) return;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*(?:image|repository):\s*["']?([^\s"']+)/i);
    if (!match) continue;
    const image = match[1];
    if (image.includes('${{')) continue;
    if (!image.startsWith(`${authority}/`)) {
      add(file, i + 1, 'error', 'deployment-image-registry',
        `Deployment image ${image} must resolve to ${authority}/${'{owner}'}/${'{repository}'}.`, lines[i]);
    }
  }
}

function auditNpm(file, content, lines) {
  const matches = [...content.matchAll(/https?:\/\/([^\s"'\/]+)[^\s"']*/ig)];
  for (const match of matches) {
    const host = match[1].toLowerCase();
    if ((/registry|publishconfig/i.test(content) || basename(file) === '.npmrc') && !allowedPackageHosts.has(host)) {
      add(file, lineNumber(content, match.index), 'error', 'npm-registry',
        `npm publication/configuration target ${host} is outside GitHub Packages.`,
        lines[lineNumber(content, match.index) - 1]);
    }
  }
}

function auditJvmPublishing(file, content, lines) {
  for (const match of content.matchAll(/https?:\/\/([^\s<"')]+)[^\s<"')]+/ig)) {
    const host = match[1].toLowerCase();
    const nearby = content.slice(Math.max(0, match.index - 200), match.index + 300);
    if (/distributionManagement|publishing\s*\{|repositories\s*\{|maven\s*\{/i.test(nearby)
        && !allowedPackageHosts.has(host)) {
      add(file, lineNumber(content, match.index), 'error', 'jvm-publish-registry',
        `Maven/Gradle publication target ${host} is outside GitHub Packages.`,
        lines[lineNumber(content, match.index) - 1]);
    }
  }
}

function summarize() {
  const errors = results.filter((r) => r.severity === 'error');
  const warnings = results.filter((r) => r.severity === 'warning');
  return {
    generatedAt: new Date().toISOString(),
    targetRoot,
    authority,
    filesScanned: filesScanned.length,
    findings: results.length,
    errors: errors.length,
    warnings: warnings.length,
    compliant: errors.length === 0,
    results
  };
}

function markdown(report) {
  const rows = report.results.length
    ? report.results.map((r) => `| ${r.severity.toUpperCase()} | \`${r.file}:${r.line}\` | ${r.rule} | ${escapePipe(r.message)} |`).join('\n')
    : '| PASS | - | - | No non-conforming registry targets found in scanned configuration files. |';

  return `# Artifact Registry Audit\n\n` +
    `- Generated: ${report.generatedAt}\n` +
    `- Authoritative container/OCI registry: \`${authority}\`\n` +
    `- Files scanned: ${report.filesScanned}\n` +
    `- Errors: ${report.errors}\n` +
    `- Warnings: ${report.warnings}\n` +
    `- Compliance: **${report.compliant ? 'PASS' : 'FAIL'}**\n\n` +
    `| Severity | Location | Rule | Finding |\n|---|---|---|---|\n${rows}\n`;
}

function escapePipe(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

if (!existsSync(targetRoot)) {
  console.error(`Target root does not exist: ${targetRoot}`);
  process.exit(2);
}

walk(targetRoot);
const report = summarize();
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
writeFileSync(markdownPath, markdown(report));

console.log(`Registry audit scanned ${report.filesScanned} relevant file(s).`);
console.log(`Findings: ${report.findings}; errors: ${report.errors}; warnings: ${report.warnings}.`);
console.log(`Reports: ${jsonPath}, ${markdownPath}`);

if (!report.compliant && !reportOnly) process.exit(1);
