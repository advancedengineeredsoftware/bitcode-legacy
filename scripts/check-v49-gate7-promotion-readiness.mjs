#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  V49_PROMOTION_READINESS_ARTIFACT_PATH,
  V49_PROMOTION_READINESS_SOURCE_ROOTS,
  buildV49PromotionReadinessReport,
} from '../scripts/specifying/src/canonical/v49-promotion-readiness-report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, '..');

function read(root, relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(root, relativePath) {
  return existsSync(path.join(root, relativePath));
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function assertCheck(failures, condition, message) {
  if (!condition) failures.push(message);
}

function parseArgs(argv) {
  const args = {
    repoRoot: defaultRepoRoot,
    promotionMode: false,
    requireRehearsal: false,
    skipBranchCheck: false,
    skipPackageTests: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo-root') args.repoRoot = path.resolve(argv[++index]);
    else if (arg === '--promotion-mode') args.promotionMode = true;
    else if (arg === '--require-rehearsal') args.requireRehearsal = true;
    else if (arg === '--skip-branch-check') args.skipBranchCheck = true;
    else if (arg === '--skip-package-tests') args.skipPackageTests = true;
    // Accepted for parity with the living CI gate-script invocation.
    else if (arg === '--skip-uapi-tests') continue;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument ${arg}`);
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/check-v49-gate7-promotion-readiness.mjs [--promotion-mode] [--require-rehearsal] [--skip-branch-check] [--skip-package-tests] [--repo-root <path>]',
      '',
      'Checks V49 Gate 7 promotion readiness: Gates 1–6 artifacts present, fresh, passing, and source-safe;',
      'promotion scripts and local-CI V49 posture; generated BITCODE_SPEC_V49_PROVEN.md; rehearsal ledger; artifact freshness.',
      '--promotion-mode admits pre-promotion V48 or post-promotion V49 pointer truth on any branch;',
      '--require-rehearsal additionally requires the signed staging-testnet rehearsal (promotion gate).',
    ].join('\n'),
  );
  process.stdout.write('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const root = args.repoRoot;
  const failures = [];
  const pointer = read(root, '.specifications/BITCODE_SPEC.txt').trim();
  assertCheck(
    failures,
    pointer === 'V48' || pointer === 'V49',
    `BITCODE_SPEC.txt must be V48 (pre-promotion) or V49 (post-promotion). Observed ${pointer || 'empty'}.`,
  );

  if (!args.skipBranchCheck && !args.promotionMode) {
    const branch = git(root, ['branch', '--show-current']);
    assertCheck(
      failures,
      branch === 'version/v49' || /^v49\/gate-\d+-[a-z0-9][a-z0-9-]*$/u.test(branch),
      `V49 work must occur on version/v49 or v49/gate-N-* branches. Observed ${branch || 'detached HEAD'}.`,
    );
  }

  for (const relativePath of [V49_PROMOTION_READINESS_ARTIFACT_PATH, ...Object.values(V49_PROMOTION_READINESS_SOURCE_ROOTS)]) {
    assertCheck(failures, exists(root, relativePath), `Missing required V49 Gate 7 file: ${relativePath}`);
  }

  const report = buildV49PromotionReadinessReport({ repoRoot: root });
  assertCheck(
    failures,
    report.passed,
    `V49 promotion readiness predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`,
  );
  for (const gate of report.gates) {
    assertCheck(failures, gate.present && gate.fresh && gate.passed, `Gate ${gate.gate} artifact ${gate.artifactPath} must be present, fresh, and passing.`);
  }
  assertCheck(failures, report.promotion.valueBearingMainnetAdmitted === false, 'Value-bearing mainnet must stay blocked.');
  if (args.requireRehearsal) {
    assertCheck(
      failures,
      report.rehearsal.attested,
      `V49 promotion requires the signed staging-testnet rehearsal (${report.promotion.blockers.join('; ')}).`,
    );
  }

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  assertCheck(
    failures,
    exists(root, V49_PROMOTION_READINESS_ARTIFACT_PATH) && read(root, V49_PROMOTION_READINESS_ARTIFACT_PATH) === serialized,
    `${V49_PROMOTION_READINESS_ARTIFACT_PATH} must be generated and current.`,
  );

  if (!args.skipPackageTests) {
    try {
      execFileSync('node', ['--test', '--test-force-exit', 'scripts/specifying/test/v49-promotion-readiness-report.test.js'], {
        cwd: root,
        stdio: 'pipe',
      });
    } catch {
      failures.push('scripts/specifying test/v49-promotion-readiness-report.test.js must pass.');
    }
  }

  if (failures.length > 0) {
    process.stderr.write('V49 Gate 7 promotion readiness check failed:\n');
    for (const failure of failures) process.stderr.write(`- ${failure}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `V49 Gate 7 promotion readiness check passed (promotion ${report.promotion.admitted ? 'admitted' : `blocked: ${report.promotion.blockers.join('; ')}`}).\n`,
  );
}

try {
  main();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${detail}\n`);
  process.exitCode = 1;
}
