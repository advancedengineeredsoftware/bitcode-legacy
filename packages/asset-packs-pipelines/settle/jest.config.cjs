/**
 * Shared base (tests/jest.base.cjs): package overrides first, then the
 * hierarchy + tsconfig catch-all (@bitcode/* → packages/*), so transitive
 * workspace packages resolve without hand-listing every dependency.
 * Overrides keep nested package subpaths (e.g. @bitcode/btd/erc1155) exact.
 */
const { createJestConfig } = require('../../../tests/jest.base.cjs');

module.exports = createJestConfig(__dirname, {
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack$':
      __dirname + '/src/index.ts',
    '^@bitcode/execution-generics$': __dirname + '/../../execution-generics/src/index.ts',
    '^@bitcode/execution-generics/(.*)$': __dirname + '/../../execution-generics/src/$1',
    '^@bitcode/generic-pipelines-execution-pipeline-simple$':
      __dirname + '/../../generic-pipelines/execution-pipeline-simple/src/index.ts',
    '^@bitcode/generic-pipelines-execution-pipeline-simple/(.*)$':
      __dirname + '/../../generic-pipelines/execution-pipeline-simple/src/$1',
    '^@bitcode/pipelines-generics$': __dirname + '/../../pipelines-generics/src/index.ts',
    '^@bitcode/pipelines-generics/(.*)$': __dirname + '/../../pipelines-generics/src/$1',
    '^@bitcode/btd/erc1155$': __dirname + '/../../btd/src/erc1155/index.ts',
    '^@bitcode/btd/(.*)$': __dirname + '/../../btd/src/$1',
    '^@bitcode/btd$': __dirname + '/../../btd/src/index.ts',
    '^@bitcode/generic-vcs-git$': __dirname + '/../../generic-vcs/git/src/index.ts',
    '^@bitcode/generic-asset-packs-read-synthesized-settled$':
      __dirname + '/../../generic-asset-packs/read-synthesized-settled/src/index.ts',
    '^@bitcode/generic-asset-packs-read-synthesized$':
      __dirname + '/../../generic-asset-packs/read-synthesized/src/index.ts',
    '^@bitcode/generic-asset-packs-synthesis/synthesis-asset-pack$':
      __dirname + '/../../generic-asset-packs/synthesis/src/synthesis-asset-pack.ts',
    '^@bitcode/generic-asset-packs-synthesis$':
      __dirname + '/../../generic-asset-packs/synthesis/src/index.ts',
    '^@bitcode/asset-packs-generics$': __dirname + '/../../asset-packs-generics/src/index.ts',
    '^@bitcode/measurement-generics$': __dirname + '/../../measurement-generics/src/index.ts',
    '^@bitcode/files$': __dirname + '/../../files/src/index.ts',
    '^@bitcode/prompts/(.*)$': __dirname + '/../../prompts/src/$1',
    '^@bitcode/prompts$': __dirname + '/../../prompts/src/index.ts',
    '^@bitcode/registry$': __dirname + '/../../registry/src/index.ts',
    '^@bitcode/logger$': __dirname + '/../../logger/src/index.ts',
    '^@bitcode/agent-generics$': __dirname + '/../../agent-generics/src/index.ts',
    '^@bitcode/agent-generics/(.*)$': __dirname + '/../../agent-generics/src/$1',
    '^@bitcode/tools-generics$': __dirname + '/../../tools-generics/src/index.ts',
    '^@bitcode/tools-generics/(.*)$': __dirname + '/../../tools-generics/src/$1',
    '^@bitcode/llm-generics$': __dirname + '/../../llm-generics/src/index.ts',
    '^@bitcode/llm-generics/(.*)$': __dirname + '/../../llm-generics/src/$1',
  },
});
