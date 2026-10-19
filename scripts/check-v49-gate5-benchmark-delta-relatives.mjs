#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH,
  V49_BENCHMARK_DELTA_RELATIVES_SOURCE_ROOTS,
  buildV49BenchmarkDeltaRelatives,
} from '../scripts/specifying/src/canonical/v49-benchmark-delta-relatives.js';

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
      'Usage: node scripts/check-v49-gate5-benchmark-delta-relatives.mjs [--skip-branch-check] [--skip-package-tests] [--skip-uapi-tests] [--repo-root <path>]',
      '',
      'Checks V49 Gate 5 benchmark-delta Relatives: declared manifest, reading law, subfamily masses (with the settlement BTD mirror), Host runner fixture proof, selection route/UI, post-synthesis measurement, living CI, SPEC law, and artifact freshness.',
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

  for (const relativePath of [V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH, ...Object.values(V49_BENCHMARK_DELTA_RELATIVES_SOURCE_ROOTS)]) {
    assertCheck(failures, exists(root, relativePath), `Missing required V49 Gate 5 file: ${relativePath}`);
  }

  const artifact = buildV49BenchmarkDeltaRelatives({ repoRoot: root });
  assertCheck(
    failures,
    artifact.passed,
    `V49 benchmark-delta Relatives predicates failed: ${artifact.coverage.failedPredicateIds.join(', ')}`,
  );
  assertCheck(failures, artifact.coverage.declaredBenchmarksOnly === true, 'Gate 5 runs declared benchmarks only.');

  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  assertCheck(
    failures,
    exists(root, V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH) && read(root, V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH) === serialized,
    `${V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH} must be generated and current.`,
  );

  if (!args.skipPackageTests) {
    try {
      run(root, 'node', ['--test', '--test-force-exit', 'scripts/specifying/test/v49-benchmark-delta-relatives.test.js']);
    } catch {
      failures.push('scripts/specifying test/v49-benchmark-delta-relatives.test.js must pass.');
    }
    for (const [pkg, tests] of [
      ['@bitcode/generic-measurements-relatives', []],
      ['@bitcode/btd', ['__tests__/settlement-btd-benchmark-relatives.test.ts']],
      ['@bitcode/pipeline-hosts', ['--config', 'jest.config.cjs', 'src/__tests__/benchmark-runner.test.ts']],
      ['@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack', ['src/__tests__/settle-benchmark-relatives.test.ts']],
    ]) {
      try {
        run(root, 'pnpm', ['--filter', pkg, 'exec', 'jest', ...tests]);
      } catch {
        failures.push(`${pkg} benchmark-delta tests must pass.`);
      }
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
        'tests/api/readBenchmarksRoute.test.ts',
        'tests/api/readSynthesizeOptionsRoute.test.ts',
        'tests/readBenchmarkDeltas.test.tsx',
        'tests/readBuyerMeasurementProjection.test.ts',
        '--runInBand',
      ]);
    } catch {
      failures.push('uapi benchmark route, selection, and display tests must pass.');
    }
  }

  if (failures.length > 0) {
    process.stderr.write('V49 Gate 5 benchmark-delta Relatives check failed:\n');
    for (const failure of failures.filter(Boolean)) process.stderr.write(`- ${failure}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write('V49 Gate 5 benchmark-delta Relatives check passed.\n');
}

try {
  main();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${detail}\n`);
  process.exitCode = 1;
}
