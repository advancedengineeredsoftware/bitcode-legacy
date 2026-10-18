#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  V49_OPENING_CHARTER_ARTIFACT_PATH,
  buildV49OpeningCharter,
} from '../scripts/specifying/src/canonical/v49-opening-charter.js';

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

function run(root, command, args) {
  execFileSync(command, args, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
}

function assertCheck(failures, condition, message) {
  if (!condition) failures.push(message);
}

function parseArgs(argv) {
  const args = {
    repoRoot: defaultRepoRoot,
    skipBranchCheck: false,
    skipPackageTests: false,
    skipUapiTests: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo-root') args.repoRoot = path.resolve(argv[++index]);
    else if (arg === '--skip-branch-check') args.skipBranchCheck = true;
    else if (arg === '--skip-package-tests') args.skipPackageTests = true;
    else if (arg === '--skip-uapi-tests') args.skipUapiTests = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument ${arg}`);
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/check-v49-gate1-opening-charter.mjs [--skip-branch-check] [--skip-package-tests] [--skip-uapi-tests] [--repo-root <path>]',
      '',
      'Checks V49 Gate 1 opening charter: draft family, V48 active / V49 draft posture, roadmap, living CI and workflow wiring, and generated artifact freshness.',
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

  // Draft work keeps the V48 pointer; after promotion the pointer is V49.
  assertCheck(
    failures,
    pointer === 'V48' || pointer === 'V49',
    `BITCODE_SPEC.txt must be V48 (draft) or V49 (promoted) for V49 gate work. Observed ${pointer || 'empty'}.`,
  );

  if (!args.skipBranchCheck) {
    const branch = git(root, ['branch', '--show-current']);
    assertCheck(
      failures,
      branch === 'version/v49' || /^v49\/gate-\d+-[a-z0-9][a-z0-9-]*$/u.test(branch),
      `V49 work must occur on version/v49 or v49/gate-N-* branches. Observed ${branch || 'detached HEAD'}.`,
    );
  }

  for (const relativePath of [
    V49_OPENING_CHARTER_ARTIFACT_PATH,
    'scripts/specifying/src/canonical/v49-opening-charter.js',
    'scripts/specifying/test/v49-opening-charter.test.js',
    'scripts/generate-v49-opening-charter.mjs',
    'scripts/check-v49-gate1-opening-charter.mjs',
    '.specifications/BITCODE_SPEC_V49.md',
    '.specifications/BITCODE_SPEC_V49_DELTA.md',
    '.specifications/BITCODE_SPEC_V49_NOTES.md',
    '.specifications/BITCODE_SPEC_V49_PARITY_MATRIX.md',
    '.specifications/BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md',
    '.specifications/SPECIFICATIONS_ROADMAP.md',
    'scripts/run-bitcode-local-ci.mjs',
    '.github/workflows/bitcode-gate-quality.yml',
    '.github/workflows/bitcode-canon-quality.yml',
    'package.json',
  ]) {
    assertCheck(failures, exists(root, relativePath), `Missing required V49 Gate 1 file: ${relativePath}`);
  }

  if (pointer === 'V48') {
    try {
      run(root, 'node', [
        'scripts/check-bitcode-spec-family.mjs',
        '--version',
        'V49',
        '--mode',
        'draft',
        '--current-target',
        'V48',
      ]);
    } catch {
      failures.push('V49 draft spec family must validate against current target V48.');
    }
  }

  const artifact = buildV49OpeningCharter({ repoRoot: root });
  assertCheck(
    failures,
    artifact.passed,
    `V49 opening charter predicates failed: ${artifact.coverage.failedPredicateIds.join(', ')}`,
  );
  assertCheck(failures, artifact.coverage.sourceSafeMetadataOnly === true, 'Artifact must be source-safe metadata only.');
  assertCheck(failures, artifact.coverage.oauthTokenMaterialVisible === false, 'Artifact must not expose OAuth token material.');
  assertCheck(failures, artifact.coverage.valueBearingMainnetEnabled === false, 'Value-bearing mainnet must remain disabled.');

  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  assertCheck(
    failures,
    exists(root, V49_OPENING_CHARTER_ARTIFACT_PATH) &&
      read(root, V49_OPENING_CHARTER_ARTIFACT_PATH) === serialized,
    `${V49_OPENING_CHARTER_ARTIFACT_PATH} must be generated and current.`,
  );

  if (!args.skipPackageTests) {
    try {
      run(root, 'node', ['--test', '--test-force-exit', 'scripts/specifying/test/v49-opening-charter.test.js']);
    } catch {
      failures.push('scripts/specifying test/v49-opening-charter.test.js must pass.');
    }
  }

  if (failures.length > 0) {
    process.stderr.write('V49 Gate 1 opening charter check failed:\n');
    for (const failure of failures.filter(Boolean)) process.stderr.write(`- ${failure}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write('V49 Gate 1 opening charter check passed.\n');
}

try {
  main();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${detail}\n`);
  process.exitCode = 1;
}
