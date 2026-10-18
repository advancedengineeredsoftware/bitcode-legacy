import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  SYNTHESIS_PIPELINE_PREFERENCE_KEY,
  isSynthesisPipelineToggleEnabled,
  synthesisPipelineRequestField,
} from '@/components/bitcode/pipeline/models/synthesis-pipeline-preference';
import BitcodeSynthesisPipelineToggle from '@/components/bitcode/routes/BitcodeSynthesisPipelineToggle/BitcodeSynthesisPipelineToggle';

describe('synthesis pipeline preference (V49 Q-1)', () => {
  const original = process.env.NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE;

  afterEach(() => {
    process.env.NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE = original;
    window.localStorage.clear();
  });

  it('omits the request field when the toggle is hidden', () => {
    delete process.env.NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE;
    window.localStorage.setItem(SYNTHESIS_PIPELINE_PREFERENCE_KEY, 'quick');
    expect(isSynthesisPipelineToggleEnabled()).toBe(false);
    expect(synthesisPipelineRequestField()).toEqual({});
  });

  it('sends the stored preference when the toggle is shown', () => {
    process.env.NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE = '1';
    expect(synthesisPipelineRequestField()).toEqual({ synthesisPipeline: 'rich' });
    window.localStorage.setItem(SYNTHESIS_PIPELINE_PREFERENCE_KEY, 'quick');
    expect(synthesisPipelineRequestField()).toEqual({ synthesisPipeline: 'quick' });
  });

  it('renders the toggle only when enabled and persists the choice', () => {
    delete process.env.NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE;
    const { unmount } = render(<BitcodeSynthesisPipelineToggle />);
    expect(screen.queryByTestId('synthesis-pipeline-toggle')).toBeNull();
    unmount();

    process.env.NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE = '1';
    render(<BitcodeSynthesisPipelineToggle />);
    fireEvent.click(screen.getByTestId('synthesis-pipeline-quick'));
    expect(screen.getByTestId('synthesis-pipeline-quick').getAttribute('aria-checked')).toBe('true');
    expect(window.localStorage.getItem(SYNTHESIS_PIPELINE_PREFERENCE_KEY)).toBe('quick');
  });
});
