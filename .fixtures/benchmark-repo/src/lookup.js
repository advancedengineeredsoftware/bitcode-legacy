// Linear scan: one comparison per element visited.
function findIndex(sorted, value, counter) {
  for (let index = 0; index < sorted.length; index += 1) {
    counter.steps += 1;
    if (sorted[index] === value) return index;
  }
  return -1;
}

module.exports = { findIndex };
