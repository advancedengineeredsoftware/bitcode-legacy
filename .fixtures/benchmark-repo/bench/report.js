// Same workload as lookup.js, reported through a JSON file (json-file metric source).
const fs = require('fs');
const path = require('path');
const { findIndex } = require('../src/lookup');

const sorted = Array.from({ length: 2000 }, (_, index) => index * 3);
const counter = { steps: 0 };
for (let probe = 0; probe < 200; probe += 1) {
  findIndex(sorted, (probe * 29) % 6000, counter);
}
const out = path.join(__dirname, '..', 'out');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ results: [{ steps: counter.steps }] }));
