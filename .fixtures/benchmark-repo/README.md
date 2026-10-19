# Benchmark fixture repository

V49 Gate 5 fixture for the benchmark-delta Relative law. Tests copy this
directory into a temporary git repository and run `runBenchmarkDeltas` on a
LocalHost checkout.

- `lookup-steps` / `lookup-report` count comparisons for a linear scan, so a
  DataPack that replaces `src/lookup.js` with binary search measures a positive
  delta (deterministic, no wall-clock timing).
- `render-throughput` is declared but its command fails, proving
  `insufficient_evidence` with zero weight.
