/**
 * Quick / Rich synthesis pipeline preference (V49 quick synthesis law Q-1).
 *
 * Shown only when `NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE=1`. When the
 * toggle is hidden, requests omit `synthesisPipeline` and the server default
 * (`BITCODE_SYNTHESIS_PIPELINE`, else `rich`) applies. The preference is a
 * per-viewer convenience in localStorage, read by both synthesize hooks.
 */

export type SynthesisPipelinePreference = 'rich' | 'quick';

export const SYNTHESIS_PIPELINE_PREFERENCE_KEY = 'bitcode:synthesis-pipeline';
export const SYNTHESIS_PIPELINE_PREFERENCE_EVENT = 'bitcode:synthesis-pipeline-change';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isSynthesisPipelineToggleEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE,
): boolean {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
}

export function readSynthesisPipelinePreference(): SynthesisPipelinePreference {
  try {
    return window.localStorage.getItem(SYNTHESIS_PIPELINE_PREFERENCE_KEY) === 'quick' ? 'quick' : 'rich';
  } catch {
    return 'rich';
  }
}

export function writeSynthesisPipelinePreference(value: SynthesisPipelinePreference): void {
  try {
    window.localStorage.setItem(SYNTHESIS_PIPELINE_PREFERENCE_KEY, value);
  } catch {
    /* storage optional */
  }
  try {
    window.dispatchEvent(new CustomEvent(SYNTHESIS_PIPELINE_PREFERENCE_EVENT, { detail: value }));
  } catch {
    /* non-browser */
  }
}

/** Request body fragment: `{ synthesisPipeline }` only when the toggle is shown. */
export function synthesisPipelineRequestField(): { synthesisPipeline?: SynthesisPipelinePreference } {
  if (!isSynthesisPipelineToggleEnabled()) return {};
  return { synthesisPipeline: readSynthesisPipelinePreference() };
}
