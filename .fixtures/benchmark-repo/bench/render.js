// Declared but broken: the renderer module does not exist, so the command fails
// and the reading is insufficient_evidence (never a penalty).
const { render } = require('../src/render');

console.log(`renders: ${render()}`);
