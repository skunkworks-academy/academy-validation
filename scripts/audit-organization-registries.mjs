import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const org = valueAfter('--org') ?? 'skunkworks-academy';
const workRoot = valueAfter('--workdir') ?? '.work/organization-registry-audit';
const outputRoot = valueAfter('--output-dir') ?? 'artifacts/organization-registry-audit';
const auditScript = new URL('./audit-registry-targets.mjs', import.meta.url).pathname;

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });
}

function escapePipe(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  console.error('Organization audit requires GH_TOKEN or GITHUB_TOKEN with read access to every repository in scope.');
  process.exit(2);
}

rmSync(workRoot, { recursive: true, force: true });
rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(workRoot, { recursive: true });
mkdirSync(outputRoot, { recursive: true });

const endpoint = `/orgs/${org}/repos?type=all&per_page=100`;
const listResult = run('gh', [
  'api', '--paginate', endpoint,
  '--jq', '.[] | [.full_name, .archived, .disabled, .fork, .visibility, .default_branch] | @tsv'
]);

if (listResult.status !== 0) {
  console.error('Unable to enumerate organization repositories.');
  console.error(listResult.stderr || listResult.stdout);
  process.exit(2);
}

const repositories = listResult.stdout
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [fullName, archived, disabled, fork, visibility, defaultBranch] = line.split('\t');
    return {
      fullName,
      archived: archived === 'true',
      disabled: disabled === 'true',
      fork: fork === 'true',
      visibility,
      defaultBranch
    };
  });

const activeRepositories = repositories.filter((repo) => !repo.archived && !repo.disabled);
const repoReports = [];

for (const repo of activeRepositories) {
  const name = basename(repo.fullName);
  const safeName = repo.fullName.replaceAll('/', '__');
  const repoDir = join(workRoot, safeName);
  const repoOutputDir = join(outputRoot, 'repositories', safeName);
  mkdirSync(repoOutputDir, { recursive: true });

  process.stdout.write(`Auditing ${repo.fullName} ... `);

  const clone = run('gh', [
    'repo', 'clone', repo.fullName, repoDir,
    '--', '--depth=1', '--filter=blob:none', '--no-tags'
  ]);

  if (clone.status !== 0) {
    console.log('CLONE FAILED');
    repoReports.push({
      repository: repo.fullName,
      visibility: repo.visibility,
      defaultBranch: repo.defaultBranch,
      status: 'clone-failed',
      compliant: false,
      filesScanned: 0,
      errors: 1,
      warnings: 0,
      findings: [{
        severity: 'error',
        rule: 'repository-access',
        file: '-',
        line: 0,
        message: (clone.stderr || clone.stdout || 'Repository clone failed').trim().slice(0, 500)
      }]
    });
    continue;
  }

  const jsonPath = join(repoOutputDir, 'registry-audit.json');
  const markdownPath = join(repoOutputDir, 'registry-audit.md');
  const audit = run(process.execPath, [
    auditScript,
    repoDir,
    '--report-only',
    '--json', jsonPath,
    '--markdown', markdownPath
  ]);

  if (audit.status !== 0) {
    console.log('AUDIT ERROR');
    repoReports.push({
      repository: repo.fullName,
      visibility: repo.visibility,
      defaultBranch: repo.defaultBranch,
      status: 'audit-error',
      compliant: false,
      filesScanned: 0,
      errors: 1,
      warnings: 0,
      findings: [{
        severity: 'error',
        rule: 'audit-runtime',
        file: '-',
        line: 0,
        message: (audit.stderr || audit.stdout || 'Registry audit failed unexpectedly').trim().slice(0, 500)
      }]
    });
    continue;
  }

  const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
  console.log(report.compliant ? 'PASS' : 'FAIL');
  repoReports.push({
    repository: repo.fullName,
    visibility: repo.visibility,
    defaultBranch: repo.defaultBranch,
    status: 'audited',
    compliant: report.compliant,
    filesScanned: report.filesScanned,
    errors: report.errors,
    warnings: report.warnings,
    findings: report.results
  });
}

const totals = repoReports.reduce((summary, report) => {
  summary.filesScanned += report.filesScanned ?? 0;
  summary.errors += report.errors ?? 0;
  summary.warnings += report.warnings ?? 0;
  if (report.compliant) summary.compliantRepositories += 1;
  else summary.nonCompliantRepositories += 1;
  if (report.status === 'clone-failed') summary.cloneFailures += 1;
  if (report.status === 'audit-error') summary.auditFailures += 1;
  return summary;
}, {
  filesScanned: 0,
  errors: 0,
  warnings: 0,
  compliantRepositories: 0,
  nonCompliantRepositories: 0,
  cloneFailures: 0,
  auditFailures: 0
});

const aggregate = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  organization: org,
  authoritativeRegistry: 'ghcr.io',
  packageAuthority: 'GitHub Packages',
  repositoriesDiscovered: repositories.length,
  repositoriesArchivedOrDisabled: repositories.length - activeRepositories.length,
  repositoriesAudited: repoReports.length,
  ...totals,
  compliant: totals.nonCompliantRepositories === 0 && repoReports.length === activeRepositories.length,
  repositories: repoReports
};

writeFileSync(join(outputRoot, 'organization-registry-audit.json'), JSON.stringify(aggregate, null, 2) + '\n');

const tableRows = repoReports.length
  ? repoReports.map((report) =>
      `| ${report.compliant ? 'PASS' : 'FAIL'} | \`${report.repository}\` | ${report.visibility ?? '-'} | ${report.filesScanned ?? 0} | ${report.errors ?? 0} | ${report.warnings ?? 0} | ${escapePipe(report.status)} |`
    ).join('\n')
  : '| FAIL | - | - | 0 | 1 | 0 | No repositories were audited |';

const markdown = `# Skunkworks Academy Organization Artifact Registry Audit\n\n` +
  `- Generated: ${aggregate.generatedAt}\n` +
  `- Organization: \`${org}\`\n` +
  `- Authoritative container / OCI registry: \`ghcr.io\`\n` +
  `- Package authority: GitHub Packages\n` +
  `- Repositories discovered: ${aggregate.repositoriesDiscovered}\n` +
  `- Active repositories audited: ${aggregate.repositoriesAudited}\n` +
  `- Compliant repositories: ${aggregate.compliantRepositories}\n` +
  `- Non-compliant repositories: ${aggregate.nonCompliantRepositories}\n` +
  `- Files scanned: ${aggregate.filesScanned}\n` +
  `- Errors: ${aggregate.errors}\n` +
  `- Warnings: ${aggregate.warnings}\n` +
  `- Overall compliance: **${aggregate.compliant ? 'PASS' : 'FAIL'}**\n\n` +
  `| Result | Repository | Visibility | Files | Errors | Warnings | Audit status |\n` +
  `|---|---|---|---:|---:|---:|---|\n${tableRows}\n`;

writeFileSync(join(outputRoot, 'organization-registry-audit.md'), markdown);

console.log(`Organization audit complete: ${aggregate.compliantRepositories}/${aggregate.repositoriesAudited} active repositories compliant.`);
console.log(`Reports written to ${outputRoot}.`);

if (!aggregate.compliant) process.exit(1);
