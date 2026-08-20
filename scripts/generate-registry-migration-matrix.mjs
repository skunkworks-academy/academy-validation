import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const input = valueAfter('--input') ?? 'artifacts/organization-registry-audit/organization-registry-audit.json';
const outputDir = valueAfter('--output-dir') ?? 'artifacts/organization-registry-audit';

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

function escapePipe(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function classify(report) {
  const rules = new Set((report.findings ?? []).map((f) => f.rule));

  if (report.status === 'clone-failed' || report.status === 'audit-error') {
    return {
      state: 'BLOCKED',
      priority: 'P0',
      action: 'Restore repository audit access/runtime, then rerun the organization audit.'
    };
  }

  if (rules.has('hardcoded-credential')) {
    return {
      state: 'REMEDIATE',
      priority: 'P0',
      action: 'Rotate exposed credential material and replace it with GitHub secret references before any deployment.'
    };
  }

  if ((report.errors ?? 0) > 0) {
    return {
      state: 'REMEDIATE',
      priority: 'P1',
      action: 'Migrate registry/authentication/image references to GitHub Packages/GHCR and rerun governance.'
    };
  }

  if ((report.warnings ?? 0) > 0) {
    return {
      state: 'REVIEW',
      priority: 'P2',
      action: 'Review warnings, confirm package publication targets, and close any policy gaps.'
    };
  }

  return {
    state: 'COMPLIANT',
    priority: 'P3',
    action: 'No registry migration required; keep governance check enabled and monitor daily audit results.'
  };
}

if (!existsSync(input)) {
  console.error(`Audit input not found: ${input}`);
  process.exit(2);
}

const audit = JSON.parse(readFileSync(input, 'utf8'));
const rows = (audit.repositories ?? []).map((report) => {
  const classification = classify(report);
  const rules = [...new Set((report.findings ?? []).map((f) => f.rule))];
  return {
    repository: report.repository,
    visibility: report.visibility ?? '-',
    auditStatus: report.status,
    compliant: Boolean(report.compliant),
    filesScanned: report.filesScanned ?? 0,
    errors: report.errors ?? 0,
    warnings: report.warnings ?? 0,
    rules,
    ...classification
  };
});

const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
rows.sort((a, b) => (order[a.priority] - order[b.priority]) || a.repository.localeCompare(b.repository));

const matrix = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  organization: audit.organization,
  sourceAuditGeneratedAt: audit.generatedAt,
  authoritativeRegistry: audit.authoritativeRegistry,
  packageAuthority: audit.packageAuthority,
  totals: {
    repositories: rows.length,
    p0: rows.filter((r) => r.priority === 'P0').length,
    p1: rows.filter((r) => r.priority === 'P1').length,
    p2: rows.filter((r) => r.priority === 'P2').length,
    compliant: rows.filter((r) => r.state === 'COMPLIANT').length
  },
  repositories: rows
};

const jsonPath = join(outputDir, 'organization-registry-migration-matrix.json');
const markdownPath = join(outputDir, 'organization-registry-migration-matrix.md');

writeFileSync(jsonPath, JSON.stringify(matrix, null, 2) + '\n');

const tableRows = rows.length
  ? rows.map((row) =>
      `| ${row.priority} | ${row.state} | \`${row.repository}\` | ${row.visibility} | ${row.errors} | ${row.warnings} | ${escapePipe(row.rules.join(', ') || '-')} | ${escapePipe(row.action)} |`
    ).join('\n')
  : '| P0 | BLOCKED | - | - | 1 | 0 | no-audit-data | No repositories were available in the audit report. |';

const markdown = `# Skunkworks Academy Registry Migration Matrix\n\n` +
  `- Generated: ${matrix.generatedAt}\n` +
  `- Source audit: ${matrix.sourceAuditGeneratedAt ?? '-'}\n` +
  `- Organization: \`${matrix.organization}\`\n` +
  `- Authoritative registry: \`${matrix.authoritativeRegistry}\`\n` +
  `- Package authority: ${matrix.packageAuthority}\n` +
  `- P0 blockers / credential issues: ${matrix.totals.p0}\n` +
  `- P1 remediation repositories: ${matrix.totals.p1}\n` +
  `- P2 review repositories: ${matrix.totals.p2}\n` +
  `- Compliant repositories: ${matrix.totals.compliant}\n\n` +
  `| Priority | State | Repository | Visibility | Errors | Warnings | Trigger rules | Required action |\n` +
  `|---|---|---|---|---:|---:|---|---|\n${tableRows}\n`;

writeFileSync(markdownPath, markdown);
console.log(`Migration matrix written to ${markdownPath} and ${jsonPath}.`);
