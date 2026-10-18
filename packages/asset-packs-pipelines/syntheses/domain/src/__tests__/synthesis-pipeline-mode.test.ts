import {
  InvalidSynthesisPipelineError,
  parseRequestedSynthesisPipeline,
  resolveSynthesisPipelineMode,
} from '../synthesis-pipeline-mode';

describe('synthesis pipeline mode (V49 Q-1)', () => {
  it('defaults to rich', () => {
    expect(resolveSynthesisPipelineMode({}, {})).toBe('rich');
  });

  it('honors the env default and a request override', () => {
    expect(resolveSynthesisPipelineMode({}, { BITCODE_SYNTHESIS_PIPELINE: 'quick' })).toBe('quick');
    expect(resolveSynthesisPipelineMode({ requested: 'rich' }, { BITCODE_SYNTHESIS_PIPELINE: 'quick' })).toBe('rich');
    expect(resolveSynthesisPipelineMode({ requested: 'quick' }, {})).toBe('quick');
    expect(resolveSynthesisPipelineMode({}, { BITCODE_SYNTHESIS_PIPELINE: 'bogus' })).toBe('rich');
  });

  it('demonstration wins unless demonstration synthesis is quick', () => {
    expect(resolveSynthesisPipelineMode({ requested: 'quick' }, { BITCODE_DEMONSTRATION_MODE: '1' })).toBe(
      'demonstration',
    );
    expect(
      resolveSynthesisPipelineMode(
        { requested: 'quick' },
        { BITCODE_DEMONSTRATION_MODE: '1', BITCODE_DEMONSTRATION_SYNTHESIS: 'quick' },
      ),
    ).toBe('quick');
  });

  it('parses request values fail-closed', () => {
    expect(parseRequestedSynthesisPipeline(undefined)).toBeNull();
    expect(parseRequestedSynthesisPipeline('')).toBeNull();
    expect(parseRequestedSynthesisPipeline(' Quick ')).toBe('quick');
    expect(() => parseRequestedSynthesisPipeline('demonstration')).toThrow(InvalidSynthesisPipelineError);
    expect(() => parseRequestedSynthesisPipeline(3)).toThrow(InvalidSynthesisPipelineError);
  });
});
