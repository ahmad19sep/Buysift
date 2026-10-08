import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  MAX_ORDINARY_DATA_BYTES,
  STORAGE_CONTROL_RESERVE_BYTES,
  STORAGE_HARD_LIMIT_BYTES,
  STORAGE_WARNING_BYTES,
  assessCapacityMutation,
} from '../../src/domain/limits.js';
import type { CapacitySnapshot } from '../../src/domain/limits.js';

function state(changes: Partial<CapacitySnapshot> = {}): CapacitySnapshot {
  return { offerCount: 0, observationCount: 0, comparisonCount: 0, ordinaryBytes: 0, controlBytes: 0, ...changes };
}

test('candidate count limits reject only the excess entity', () => {
  assert.equal(assessCapacityMutation(state({ offerCount: 24 }), state({ offerCount: 25 }), 'create_offer').allowed, true);
  assert.deepEqual(
    assessCapacityMutation(state({ offerCount: 25 }), state({ offerCount: 26 }), 'create_offer').reasons,
    ['offer_limit'],
  );
  assert.equal(assessCapacityMutation(
    state({ offerCount: 25, observationCount: 499 }),
    state({ offerCount: 25, observationCount: 500 }),
    'add_observation',
  ).allowed, true, 'an existing offer can receive the 500th observation at the offer cap');
  assert.ok(assessCapacityMutation(
    state({ offerCount: 25, observationCount: 500 }),
    state({ offerCount: 25, observationCount: 501 }),
    'add_observation',
  ).reasons.includes('observation_limit'));
  assert.ok(assessCapacityMutation(
    state({ comparisonCount: 3 }),
    state({ comparisonCount: 4 }),
    'comparison_selection',
  ).reasons.includes('comparison_limit'));
});

test('ordinary growth leaves the recovery reserve and warning starts at four MiB', () => {
  const warning = assessCapacityMutation(
    state({ ordinaryBytes: STORAGE_WARNING_BYTES - 1 }),
    state({ ordinaryBytes: STORAGE_WARNING_BYTES }),
    'metadata_fix',
  );
  assert.equal(warning.allowed, true);
  assert.equal(warning.warning, true);

  const exact = assessCapacityMutation(
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES - 1 }),
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES }),
    'metadata_fix',
  );
  assert.equal(exact.allowed, true);
  const reserveConsumed = assessCapacityMutation(
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES }),
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES + 1 }),
    'metadata_fix',
  );
  assert.ok(reserveConsumed.reasons.includes('control_reserve'));

  const control = assessCapacityMutation(
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES, controlBytes: 0 }),
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES, controlBytes: STORAGE_CONTROL_RESERVE_BYTES }),
    'control_recovery',
  );
  assert.equal(control.allowed, true);
  assert.equal(control.totalBytes, STORAGE_HARD_LIMIT_BYTES);
  assert.ok(assessCapacityMutation(
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES }),
    state({ ordinaryBytes: MAX_ORDINARY_DATA_BYTES, controlBytes: STORAGE_CONTROL_RESERVE_BYTES + 1 }),
    'control_recovery',
  ).reasons.includes('control_reserve'));
});

test('export and reducing deletion remain available under existing over-cap state', () => {
  const over = state({ offerCount: 26, observationCount: 501, ordinaryBytes: STORAGE_HARD_LIMIT_BYTES });
  assert.equal(assessCapacityMutation(over, over, 'export').allowed, true);
  assert.equal(assessCapacityMutation(over, state({ ...over, offerCount: 25, ordinaryBytes: over.ordinaryBytes - 100 }), 'delete').allowed, true);
  assert.equal(assessCapacityMutation(over, state({ ...over, ordinaryBytes: over.ordinaryBytes + 1 }), 'delete').allowed, false);
});

test('malformed candidate states fail rather than bypass capacity arithmetic', () => {
  assert.throws(() => assessCapacityMutation(state(), state({ offerCount: 0.5 }), 'metadata_fix'), /safe integer/);
  assert.throws(() => assessCapacityMutation(state(), state({ ordinaryBytes: -1 }), 'metadata_fix'), /nonnegative/);
});
