import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { updateComparisonSelection } from '../../src/ui/popup/selection.js';

test('comparison selection accepts three offers and rejects a fourth without changing the selection', () => {
  let selected: ReadonlySet<string> = new Set();
  for (const id of ['a', 'b', 'c']) {
    const result = updateComparisonSelection(selected, id, true);
    assert.equal(result.changed, true);
    assert.equal(result.message, null);
    selected = result.selected;
  }

  const fourth = updateComparisonSelection(selected, 'd', true);
  assert.equal(fourth.changed, false);
  assert.match(fourth.message ?? '', /up to 3 offers/);
  assert.deepEqual([...fourth.selected], ['a', 'b', 'c']);

  const removed = updateComparisonSelection(fourth.selected, 'b', false);
  assert.equal(removed.changed, true);
  assert.deepEqual([...removed.selected], ['a', 'c']);
  const replacement = updateComparisonSelection(removed.selected, 'd', true);
  assert.deepEqual([...replacement.selected], ['a', 'c', 'd']);
});
