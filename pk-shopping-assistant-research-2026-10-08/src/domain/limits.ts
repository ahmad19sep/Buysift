export const MAX_SAVED_OFFERS = 25;
export const MAX_OBSERVATIONS = 500;
export const MAX_COMPARED_OFFERS = 3;
export const STORAGE_WARNING_BYTES = 4 * 1024 * 1024;
export const STORAGE_HARD_LIMIT_BYTES = 5 * 1024 * 1024;
export const STORAGE_CONTROL_RESERVE_BYTES = 128 * 1024;
export const MAX_ORDINARY_DATA_BYTES = STORAGE_HARD_LIMIT_BYTES - STORAGE_CONTROL_RESERVE_BYTES;
export const ACTIVE_HISTORY_DAYS = 90;
export const ACTIVE_HISTORY_WINDOW_MS = ACTIVE_HISTORY_DAYS * 24 * 60 * 60 * 1000;
export const FUTURE_CLOCK_ERROR_MS = 5 * 60 * 1000;
export const MAX_MONEY_AMOUNT_MINOR = 100_000_000;

export const P0_LIMITS = Object.freeze({
  savedOffers: MAX_SAVED_OFFERS,
  observations: MAX_OBSERVATIONS,
  comparedOffers: MAX_COMPARED_OFFERS,
  storageWarningBytes: STORAGE_WARNING_BYTES,
  storageHardLimitBytes: STORAGE_HARD_LIMIT_BYTES,
  storageControlReserveBytes: STORAGE_CONTROL_RESERVE_BYTES,
  ordinaryDataBytes: MAX_ORDINARY_DATA_BYTES,
  activeHistoryDays: ACTIVE_HISTORY_DAYS,
  activeHistoryWindowMs: ACTIVE_HISTORY_WINDOW_MS,
  futureClockErrorMs: FUTURE_CLOCK_ERROR_MS,
  maxMoneyAmountMinor: MAX_MONEY_AMOUNT_MINOR,
});

export interface CapacitySnapshot {
  offerCount: number;
  observationCount: number;
  comparisonCount: number;
  ordinaryBytes: number;
  controlBytes: number;
}

export type CapacityMutationKind =
  | "create_offer"
  | "add_observation"
  | "metadata_fix"
  | "comparison_selection"
  | "control_recovery"
  | "export"
  | "delete";

export type CapacityRejection =
  | "invalid_mutation"
  | "offer_limit"
  | "observation_limit"
  | "comparison_limit"
  | "control_reserve"
  | "hard_limit";

export interface CapacityAssessment {
  allowed: boolean;
  reasons: CapacityRejection[];
  warning: boolean;
  totalBytes: number;
  ordinaryBytesRemaining: number;
  hardBytesRemaining: number;
}

function assertCount(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a nonnegative safe integer`);
  }
}

function assertSnapshot(snapshot: CapacitySnapshot, label: string): void {
  assertCount(snapshot.offerCount, `${label}.offerCount`);
  assertCount(snapshot.observationCount, `${label}.observationCount`);
  assertCount(snapshot.comparisonCount, `${label}.comparisonCount`);
  assertCount(snapshot.ordinaryBytes, `${label}.ordinaryBytes`);
  assertCount(snapshot.controlBytes, `${label}.controlBytes`);
  if (!Number.isSafeInteger(snapshot.ordinaryBytes + snapshot.controlBytes)) {
    throw new RangeError(`${label} byte total must be a safe integer`);
  }
}

function totalBytes(snapshot: CapacitySnapshot): number {
  return snapshot.ordinaryBytes + snapshot.controlBytes;
}

function pushUnique(reasons: CapacityRejection[], reason: CapacityRejection): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

/**
 * Assesses an already-computed candidate state. The caller remains responsible
 * for computing byte size from the exact serialization it will persist.
 */
export function assessCapacityMutation(
  before: CapacitySnapshot,
  after: CapacitySnapshot,
  kind: CapacityMutationKind,
): CapacityAssessment {
  assertSnapshot(before, "before");
  assertSnapshot(after, "after");

  const reasons: CapacityRejection[] = [];
  const afterTotal = totalBytes(after);
  const offersDelta = after.offerCount - before.offerCount;
  const observationsDelta = after.observationCount - before.observationCount;
  const comparisonsDelta = after.comparisonCount - before.comparisonCount;
  const ordinaryDelta = after.ordinaryBytes - before.ordinaryBytes;
  const controlDelta = after.controlBytes - before.controlBytes;

  if (kind === "export") {
    if (offersDelta !== 0 || observationsDelta !== 0 || comparisonsDelta !== 0 || ordinaryDelta !== 0 || controlDelta !== 0) {
      pushUnique(reasons, "invalid_mutation");
    }
  } else if (kind === "delete") {
    const neverGrows = offersDelta <= 0 && observationsDelta <= 0 && comparisonsDelta <= 0
      && ordinaryDelta <= 0 && controlDelta <= 0;
    const reducesSomething = offersDelta < 0 || observationsDelta < 0 || comparisonsDelta < 0
      || ordinaryDelta < 0 || controlDelta < 0;
    if (!neverGrows || !reducesSomething) pushUnique(reasons, "invalid_mutation");
  } else if (kind === "create_offer") {
    if (offersDelta !== 1 || observationsDelta < 0 || comparisonsDelta !== 0 || controlDelta !== 0) {
      pushUnique(reasons, "invalid_mutation");
    }
  } else if (kind === "add_observation") {
    if (offersDelta !== 0 || observationsDelta !== 1 || comparisonsDelta !== 0 || controlDelta !== 0) {
      pushUnique(reasons, "invalid_mutation");
    }
  } else if (kind === "metadata_fix") {
    if (offersDelta !== 0 || observationsDelta !== 0 || comparisonsDelta !== 0 || controlDelta !== 0) {
      pushUnique(reasons, "invalid_mutation");
    }
  } else if (kind === "comparison_selection") {
    if (offersDelta !== 0 || observationsDelta !== 0 || ordinaryDelta !== 0 || controlDelta !== 0) {
      pushUnique(reasons, "invalid_mutation");
    }
  } else if (kind === "control_recovery") {
    if (offersDelta !== 0 || observationsDelta !== 0 || comparisonsDelta !== 0 || ordinaryDelta !== 0) {
      pushUnique(reasons, "invalid_mutation");
    }
  }

  // Export and monotonic cleanup must remain available even if existing data is
  // already over a cap. Every other candidate must fit its applicable limits.
  const recoveryOperation = kind === "export" || kind === "delete";
  if (!recoveryOperation) {
    if (after.offerCount > MAX_SAVED_OFFERS) pushUnique(reasons, "offer_limit");
    if (after.observationCount > MAX_OBSERVATIONS) pushUnique(reasons, "observation_limit");
    if (after.comparisonCount > MAX_COMPARED_OFFERS) pushUnique(reasons, "comparison_limit");
    if (afterTotal > STORAGE_HARD_LIMIT_BYTES) pushUnique(reasons, "hard_limit");
    if (after.controlBytes > STORAGE_CONTROL_RESERVE_BYTES) pushUnique(reasons, "control_reserve");
    if (kind !== "control_recovery" && after.ordinaryBytes > MAX_ORDINARY_DATA_BYTES) {
      pushUnique(reasons, "control_reserve");
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    warning: afterTotal >= STORAGE_WARNING_BYTES,
    totalBytes: afterTotal,
    ordinaryBytesRemaining: Math.max(0, MAX_ORDINARY_DATA_BYTES - after.ordinaryBytes),
    hardBytesRemaining: Math.max(0, STORAGE_HARD_LIMIT_BYTES - afterTotal),
  };
}
