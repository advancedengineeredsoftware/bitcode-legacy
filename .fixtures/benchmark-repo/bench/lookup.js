// Deterministic benchmark: comparisons needed for 200 lookups in 2000 sorted values.
const { findIndex } = require('../src/lookup');

const sorted = Array.from({ length: 2000 }, (_, index) => index * 3);
const counter = { steps: 0 };
for (let probe = 0; probe < 200; probe += 1) {
  findIndex(sorted, (probe * 29) % 6000, counter);
}
console.log(`steps: ${counter.steps}`);
