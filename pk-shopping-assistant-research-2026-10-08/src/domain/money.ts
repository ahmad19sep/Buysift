import { MAX_MONEY_AMOUNT_MINOR as MAX_MONEY_MINOR } from "./limits.js";
import type { Money, PriceComponents } from "./types.js";

export type MoneyIssueCode =
  | "malformed_amount"
  | "invalid_amount_minor"
  | "negative_amount"
  | "zero_not_allowed"
  | "component_limit_exceeded"
  | "unsupported_currency"
  | "invalid_minor_unit";

export interface MoneyIssue {
  readonly code: MoneyIssueCode;
  readonly field: string;
  readonly message: string;
}

export type MoneyParseResult =
  | { readonly ok: true; readonly value: Money }
  | { readonly ok: false; readonly issues: readonly MoneyIssue[] };

export type MoneyValidationResult = MoneyParseResult;

export interface MoneyValidationOptions {
  readonly field?: string;
  readonly positive?: boolean;
}

export type PriceRequirement =
  | "item"
  | "shipping"
  | "tax"
  | "mandatory_fees"
  | "additional_discount"
  | "location_scope"
  | "payment_context";

export type PriceIssueCode =
  | "invalid_price_components"
  | "invalid_evidence"
  | "invalid_money"
  | "tax_included_with_additional_amount"
  | "incomplete_mandatory_fees"
  | "invalid_mandatory_fees"
  | "discount_already_included"
  | "conditional_discount"
  | "discount_exceeds_subtotal"
  | "invalid_location_scope"
  | "invalid_payment_context"
  | "unsafe_total";

export interface PriceIssue {
  readonly code: PriceIssueCode;
  readonly field: string;
  readonly message: string;
}

/**
 * A subtotal contains every usable component supplied by the record. It can be
 * incomplete, so callers must use deliveredTotal for a complete delivered-cost
 * comparison. A conditional or malformed discount is never subtracted.
 */
export interface PriceSummary {
  readonly item: Money | null;
  readonly knownSubtotal: Money | null;
  readonly deliveredTotal: Money | null;
  readonly deliveredEligible: boolean;
  readonly missing: readonly PriceRequirement[];
  readonly issues: readonly PriceIssue[];
}

const STRICT_PKR_PATTERN = /^(?:(?:PKR|Rs\.?)\s+)?(?:(?:0|[1-9]\d*)|(?:[1-9]\d{0,2}(?:,\d{3})+))(?:\.(\d{1,2}))?$/i;
const MAX_SAFE_MINOR = BigInt(Number.MAX_SAFE_INTEGER);
const ALLOWED_PAYMENT_CONTEXTS = new Set(["standard", "cod", "specified_card"]);

function money(amountMinor: number): Money {
  return { amountMinor, currency: "PKR", minorUnit: 2 };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function malformed(field: string, message: string): MoneyValidationResult {
  return {
    ok: false,
    issues: [{ code: "malformed_amount", field, message }],
  };
}

/**
 * Parses an ASCII PKR form amount without passing through binary floating point.
 * Accepted examples are `7000`, `7,000`, `Rs 7,000`, and `PKR 7,000.50`.
 */
export function parsePkr(input: string): MoneyParseResult {
  if (typeof input !== "string") {
    return malformed("amount", "PKR amount must be text.");
  }

  const value = input.trim();
  const match = STRICT_PKR_PATTERN.exec(value);
  if (match === null) {
    return malformed(
      "amount",
      "Use PKR digits with optional correctly placed commas and at most two decimal places.",
    );
  }

  const numeric = value.replace(/^(?:PKR|Rs\.?)\s+/i, "");
  const [wholePart = "", fractionPart = ""] = numeric.split(".");
  const normalizedWhole = wholePart.replaceAll(",", "");

  try {
    const amountMinor = BigInt(normalizedWhole) * 100n
      + BigInt(fractionPart.padEnd(2, "0") || "0");
    if (amountMinor > BigInt(MAX_MONEY_MINOR)) {
      return {
        ok: false,
        issues: [{
          code: "component_limit_exceeded",
          field: "amount",
          message: `A money component cannot exceed ${MAX_MONEY_MINOR} minor units.`,
        }],
      };
    }
    if (amountMinor > MAX_SAFE_MINOR) {
      return {
        ok: false,
        issues: [{
          code: "invalid_amount_minor",
          field: "amount",
          message: "The parsed amount is not a safe integer.",
        }],
      };
    }
    return { ok: true, value: money(Number(amountMinor)) };
  } catch {
    return malformed("amount", "PKR amount could not be parsed.");
  }
}

/**
 * Checks the arithmetic invariants needed by this module. Exact object-shape
 * validation remains at the application boundary.
 */
export function validateMoneyArithmetic(
  value: unknown,
  options: MoneyValidationOptions = {},
): MoneyValidationResult {
  const field = options.field ?? "money";
  const candidate = record(value);
  if (candidate === null) {
    return malformed(field, `${field} must be a money object.`);
  }

  const issues: MoneyIssue[] = [];
  const amountMinor = candidate.amountMinor;
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor) || !Number.isSafeInteger(amountMinor)) {
    issues.push({
      code: "invalid_amount_minor",
      field: `${field}.amountMinor`,
      message: "Money must use safe integer minor units.",
    });
  } else if (amountMinor < 0) {
    issues.push({
      code: "negative_amount",
      field: `${field}.amountMinor`,
      message: "Money cannot be negative.",
    });
  } else {
    if (options.positive === true && amountMinor === 0) {
      issues.push({
        code: "zero_not_allowed",
        field: `${field}.amountMinor`,
        message: "The item amount must be positive.",
      });
    }
    if (amountMinor > MAX_MONEY_MINOR) {
      issues.push({
        code: "component_limit_exceeded",
        field: `${field}.amountMinor`,
        message: `A money component cannot exceed ${MAX_MONEY_MINOR} minor units.`,
      });
    }
  }

  if (candidate.currency !== "PKR") {
    issues.push({
      code: "unsupported_currency",
      field: `${field}.currency`,
      message: "Only PKR components can be combined.",
    });
  }
  if (candidate.minorUnit !== 2) {
    issues.push({
      code: "invalid_minor_unit",
      field: `${field}.minorUnit`,
      message: "PKR amounts use two decimal places internally.",
    });
  }

  return issues.length === 0
    ? { ok: true, value: value as Money }
    : { ok: false, issues };
}

function evidenceValue(
  value: unknown,
  requirement: PriceRequirement,
  missing: Set<PriceRequirement>,
  issues: PriceIssue[],
): unknown | undefined {
  const candidate = record(value);
  if (candidate === null || (candidate.state !== "known" && candidate.state !== "unknown")) {
    missing.add(requirement);
    issues.push({
      code: "invalid_evidence",
      field: requirement,
      message: `${requirement} must be known evidence or a structured unknown.`,
    });
    return undefined;
  }
  if (candidate.state === "unknown") {
    missing.add(requirement);
    return undefined;
  }
  return candidate.value;
}

function addMoneyIssues(issues: PriceIssue[], result: MoneyValidationResult): void {
  if (result.ok) return;
  for (const issue of result.issues) {
    issues.push({ code: "invalid_money", field: issue.field, message: issue.message });
  }
}

/**
 * Computes the honest known subtotal and, only with complete evidence, a
 * delivered total. The item is already the payable markdown price; this
 * function never accepts a list price and therefore cannot subtract a markdown.
 */
export function summarizePriceComponents(price: PriceComponents | unknown): PriceSummary {
  const candidate = record(price);
  if (candidate === null) {
    return {
      item: null,
      knownSubtotal: null,
      deliveredTotal: null,
      deliveredEligible: false,
      missing: [
        "item", "shipping", "tax", "mandatory_fees", "additional_discount",
        "location_scope", "payment_context",
      ],
      issues: [{
        code: "invalid_price_components",
        field: "price",
        message: "Price components must be an object.",
      }],
    };
  }

  const missing = new Set<PriceRequirement>();
  const issues: PriceIssue[] = [];
  const itemResult = validateMoneyArithmetic(candidate.item, { field: "item", positive: true });
  addMoneyIssues(issues, itemResult);
  if (!itemResult.ok) missing.add("item");
  const item = itemResult.ok ? itemResult.value : null;
  let subtotalMinor = item === null ? null : BigInt(item.amountMinor);

  const addKnownAmount = (value: unknown, field: string, requirement: PriceRequirement): Money | null => {
    const result = validateMoneyArithmetic(value, { field });
    if (!result.ok) {
      missing.add(requirement);
      addMoneyIssues(issues, result);
      return null;
    }
    if (subtotalMinor !== null) subtotalMinor += BigInt(result.value.amountMinor);
    return result.value;
  };

  const shipping = evidenceValue(candidate.shipping, "shipping", missing, issues);
  if (shipping !== undefined) addKnownAmount(shipping, "shipping.value", "shipping");

  const tax = evidenceValue(candidate.tax, "tax", missing, issues);
  if (tax !== undefined) {
    const taxRecord = record(tax);
    if (taxRecord === null || typeof taxRecord.includedInItem !== "boolean") {
      missing.add("tax");
      issues.push({ code: "invalid_evidence", field: "tax.value", message: "Known tax evidence is malformed." });
    } else {
      const taxMoney = validateMoneyArithmetic(taxRecord.additional, { field: "tax.value.additional" });
      if (!taxMoney.ok) {
        missing.add("tax");
        addMoneyIssues(issues, taxMoney);
      } else if (taxRecord.includedInItem && taxMoney.value.amountMinor !== 0) {
        missing.add("tax");
        issues.push({
          code: "tax_included_with_additional_amount",
          field: "tax.value",
          message: "Tax marked as included must have zero additional tax.",
        });
      } else if (!taxRecord.includedInItem && subtotalMinor !== null) {
        subtotalMinor += BigInt(taxMoney.value.amountMinor);
      }
    }
  }

  const mandatoryFees = evidenceValue(candidate.mandatoryFees, "mandatory_fees", missing, issues);
  if (mandatoryFees !== undefined) {
    const feesRecord = record(mandatoryFees);
    if (feesRecord === null || !Array.isArray(feesRecord.items) || typeof feesRecord.complete !== "boolean") {
      missing.add("mandatory_fees");
      issues.push({
        code: "invalid_mandatory_fees",
        field: "mandatoryFees.value",
        message: "Known mandatory fees must contain a completeness flag and fee list.",
      });
    } else {
      if (!feesRecord.complete) {
        missing.add("mandatory_fees");
        issues.push({
          code: "incomplete_mandatory_fees",
          field: "mandatoryFees.value.complete",
          message: "Every mandatory fee must be accounted for, including an explicitly empty list.",
        });
      }
      for (const [index, fee] of feesRecord.items.entries()) {
        const feeRecord = record(fee);
        if (feeRecord === null) {
          missing.add("mandatory_fees");
          issues.push({
            code: "invalid_mandatory_fees",
            field: `mandatoryFees.value.items[${index}]`,
            message: "A mandatory fee entry must be an object.",
          });
          continue;
        }
        addKnownAmount(feeRecord.amount, `mandatoryFees.value.items[${index}].amount`, "mandatory_fees");
      }
    }
  }

  let applicableDiscount: Money | null = null;
  const additionalDiscount = evidenceValue(
    candidate.additionalDiscount,
    "additional_discount",
    missing,
    issues,
  );
  if (additionalDiscount !== undefined) {
    const discountRecord = record(additionalDiscount);
    if (discountRecord === null || !Array.isArray(discountRecord.conditions)
      || !discountRecord.conditions.every((condition) => typeof condition === "string")) {
      missing.add("additional_discount");
      issues.push({
        code: "invalid_evidence",
        field: "additionalDiscount.value",
        message: "Known discount evidence is malformed.",
      });
    } else if (discountRecord.alreadyIncluded !== false) {
      missing.add("additional_discount");
      issues.push({
        code: "discount_already_included",
        field: "additionalDiscount.value.alreadyIncluded",
        message: "A price reduction already included in the item amount must not be subtracted again.",
      });
    } else if (discountRecord.conditions.length !== 0) {
      missing.add("additional_discount");
      issues.push({
        code: "conditional_discount",
        field: "additionalDiscount.value.conditions",
        message: "A conditional discount cannot reduce a general delivered total.",
      });
    } else {
      const discountMoney = validateMoneyArithmetic(discountRecord.amount, {
        field: "additionalDiscount.value.amount",
      });
      if (!discountMoney.ok) {
        missing.add("additional_discount");
        addMoneyIssues(issues, discountMoney);
      } else {
        applicableDiscount = discountMoney.value;
      }
    }
  }

  const locationScope = evidenceValue(candidate.locationScope, "location_scope", missing, issues);
  if (locationScope !== undefined && (typeof locationScope !== "string" || locationScope.trim().length === 0)) {
    missing.add("location_scope");
    issues.push({
      code: "invalid_location_scope",
      field: "locationScope.value",
      message: "A delivered total needs a non-empty location scope.",
    });
  }

  const paymentContext = evidenceValue(candidate.paymentContext, "payment_context", missing, issues);
  if (paymentContext !== undefined
    && (typeof paymentContext !== "string" || !ALLOWED_PAYMENT_CONTEXTS.has(paymentContext))) {
    missing.add("payment_context");
    issues.push({
      code: "invalid_payment_context",
      field: "paymentContext.value",
      message: "A delivered total needs a supported payment context.",
    });
  }

  if (subtotalMinor !== null && applicableDiscount !== null) {
    const discountMinor = BigInt(applicableDiscount.amountMinor);
    if (discountMinor > subtotalMinor) {
      missing.add("additional_discount");
      issues.push({
        code: "discount_exceeds_subtotal",
        field: "additionalDiscount.value.amount",
        message: "An additional discount cannot exceed its eligible subtotal.",
      });
    } else {
      subtotalMinor -= discountMinor;
    }
  }

  if (subtotalMinor !== null && subtotalMinor > MAX_SAFE_MINOR) {
    issues.push({
      code: "unsafe_total",
      field: "price",
      message: "The summed price is outside the safe integer range.",
    });
    subtotalMinor = null;
  }

  const knownSubtotal = subtotalMinor === null ? null : money(Number(subtotalMinor));
  const deliveredEligible = knownSubtotal !== null && missing.size === 0 && issues.length === 0;
  return {
    item,
    knownSubtotal,
    deliveredTotal: deliveredEligible ? money(knownSubtotal.amountMinor) : null,
    deliveredEligible,
    missing: [...missing],
    issues,
  };
}
