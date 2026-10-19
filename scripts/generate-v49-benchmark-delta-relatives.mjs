#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH,
  buildV49BenchmarkDeltaRelatives,
} from '../scripts/specifying/src/canonical/v49-benchmark-delta-relatives.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const artifact = buildV49BenchmarkDeltaRelatives({ repoRoot });
const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
const artifactPath = path.join(repoRoot, V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH);

if (checkOnly) {
  if (!existsSync(artifactPath) || readFileSync(artifactPath, 'utf8') !== serialized) {
    process.stderr.write(
      `${V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH} is stale. Run pnpm run generate:v49-benchmark-delta-relatives.\n`,
    );
    process.exitCode = 1;
  }
} else {
  mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, serialized);
  process.stdout.write(`wrote ${V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH}\n`);
}
