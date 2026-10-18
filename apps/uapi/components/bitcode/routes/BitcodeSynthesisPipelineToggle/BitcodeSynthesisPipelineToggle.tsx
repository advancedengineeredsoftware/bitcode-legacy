/**
 * BitcodeSynthesisPipelineToggle — Quick / Rich synthesis selector shown above
 * the synthesize CTA when NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE=1.
 * Quick = one model call; Rich = full SDIVF agent pipeline.
 */

'use client';

import React from 'react';

import {
  SYNTHESIS_PIPELINE_PREFERENCE_EVENT,
  isSynthesisPipelineToggleEnabled,
  readSynthesisPipelinePreference,
  writeSynthesisPipelinePreference,
  type SynthesisPipelinePreference,
} from '@/components/bitcode/pipeline/models/synthesis-pipeline-preference';

const OPTIONS: Array<{ value: SynthesisPipelinePreference; label: string; hint: string }> = [
  { value: 'quick', label: 'Quick', hint: 'One model call — fastest' },
  { value: 'rich', label: 'Rich', hint: 'Full multi-agent pipeline' },
];

export function BitcodeSynthesisPipelineToggle({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = React.useState<SynthesisPipelinePreference>('rich');

  React.useEffect(() => {
    setValue(readSynthesisPipelinePreference());
    const onChange = () => setValue(readSynthesisPipelinePreference());
    window.addEventListener(SYNTHESIS_PIPELINE_PREFERENCE_EVENT, onChange);
    return () => window.removeEventListener(SYNTHESIS_PIPELINE_PREFERENCE_EVENT, onChange);
  }, []);

  if (!isSynthesisPipelineToggleEnabled()) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Synthesis pipeline"
      data-testid="synthesis-pipeline-toggle"
      className="mt-4 grid grid-cols-2 gap-2"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            data-testid={`synthesis-pipeline-${option.value}`}
            onClick={() => {
              setValue(option.value);
              writeSynthesisPipelinePreference(option.value);
            }}
            className={`border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-emerald-300/60 bg-emerald-300/10 text-white'
                : 'border-white/10 bg-black/20 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="block font-semibold uppercase tracking-[0.16em]">{option.label}</span>
            <span className="block text-[0.68rem] text-neutral-500">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BitcodeSynthesisPipelineToggle;
