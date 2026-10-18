#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  V49_QUICK_SYNTHESIS_ARTIFACT_PATH,
  V49_QUICK_SYNTHESIS_SOURCE_ROOTS,
  buildV49QuickSynthesis,
} from '../scripts/specifying/src/canonical/v49-quick-synthesis.js';

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
      'Usage: node scripts/check-v49-gate3-quick-synthesis.mjs [--skip-branch-check] [--skip-package-tests] [--skip-uapi-tests] [--repo-root <path>]',
      '',
      'Checks V49 Gate 3 quick synthesis: QUICK pipelines, one-model-call invariant and tests, mode resolution, routes, dispatchers, toggle, living CI, SPEC law, and artifact freshness.',
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

  for (const relativePath of [V49_QUICK_SYNTHESIS_ARTIFACT_PATH, ...Object.values(V49_QUICK_SYNTHESIS_SOURCE_ROOTS)]) {
    assertCheck(failures, exists(root, relativePath), `Missing required V49 Gate 3 file: ${relativePath}`);
  }

  const artifact = buildV49QuickSynthesis({ repoRoot: root });
  assertCheck(
    failures,
    artifact.passed,
    `V49 quick synthesis predicates failed: ${artifact.coverage.failedPredicateIds.join(', ')}`,
  );
  assertCheck(failures, artifact.modelCallsPerRun === 1, 'Quick synthesis must make exactly one model call per run.');

  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  assertCheck(
    failures,
    exists(root, V49_QUICK_SYNTHESIS_ARTIFACT_PATH) && read(root, V49_QUICK_SYNTHESIS_ARTIFACT_PATH) === serialized,
    `${V49_QUICK_SYNTHESIS_ARTIFACT_PATH} must be generated and current.`,
  );

  if (!args.skipPackageTests) {
    try {
      run(root, 'node', ['--test', '--test-force-exit', 'scripts/specifying/test/v49-quick-synthesis.test.js']);
    } catch {
      failures.push('scripts/specifying test/v49-quick-synthesis.test.js must pass.');
    }
    try {
      run(root, 'pnpm', ['--filter', '@bitcode/asset-packs-pipelines-syntheses-quick', 'run', 'test']);
    } catch {
      failures.push('@bitcode/asset-packs-pipelines-syntheses-quick tests must pass.');
    }
  }

  if (!args.skipUapiTests) {
    try {
      run(root, 'pnpm', [
        '--dir',
        'apps/uapi',
        'exec',
        'jest',
        '--runTestsByPath',
        'tests/synthesisPipelinePreference.test.tsx',
        '--runInBand',
      ]);
    } catch {
      failures.push('uapi synthesisPipelinePreference.test.tsx must pass.');
    }
  }

  if (failures.length > 0) {
    process.stderr.write('V49 Gate 3 quick synthesis check failed:\n');
    for (const failure of failures.filter(Boolean)) process.stderr.write(`- ${failure}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write('V49 Gate 3 quick synthesis check passed.\n');
}

try {
  main();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${detail}\n`);
  process.exitCode = 1;
}
