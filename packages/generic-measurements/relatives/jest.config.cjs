const path = require('path');
const { createJestConfig } = require('../../../tests/jest.base.cjs');

module.exports = createJestConfig(__dirname, {
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@bitcode/generic-measurements-relatives$': path.join(__dirname, 'src/index.ts'),
    '^@bitcode/generic-measurements-relatives/benchmark-delta$': path.join(__dirname, 'src/benchmark-delta/index.ts'),
    '^@bitcode/generic-measurements-relatives/relative-subfamily-masses$': path.join(
      __dirname,
      'src/relative-subfamily-masses.ts',
    ),
  },
});
