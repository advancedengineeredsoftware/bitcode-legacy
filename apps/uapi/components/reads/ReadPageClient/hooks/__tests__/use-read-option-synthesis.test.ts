/**
 * UI contract for dynamic relative naming (must end with -fit).
 */

function slugifyRelativeKind(raw: string): string {
  const base = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (!base) return 'unspecified-fit';
  return base.endsWith('-fit') ? base : `${base}-fit`;
}

describe('read option relative naming (UI contract)', () => {
  it('forces -fit suffix for dynamic kinds', () => {
    expect(slugifyRelativeKind('needs session refresh')).toBe('session-refresh-fit');
    expect(slugifyRelativeKind('language-fit')).toBe('language-fit');
  });
});
