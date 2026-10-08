import { MAX_COMPARED_OFFERS } from '../../domain/index.js';

export interface ComparisonSelectionResult {
  selected: ReadonlySet<string>;
  changed: boolean;
  message: string | null;
}

export function updateComparisonSelection(
  current: ReadonlySet<string>,
  offerId: string,
  checked: boolean,
): ComparisonSelectionResult {
  const next = new Set(current);
  if (!checked) {
    const changed = next.delete(offerId);
    return { selected: next, changed, message: null };
  }
  if (next.has(offerId)) return { selected: next, changed: false, message: null };
  if (next.size >= MAX_COMPARED_OFFERS) {
    return {
      selected: next,
      changed: false,
      message: 'You can compare up to 3 offers. Remove one before adding another.',
    };
  }
  next.add(offerId);
  return { selected: next, changed: true, message: null };
}
