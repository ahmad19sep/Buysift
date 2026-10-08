import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { parsePkr, summarizePriceComponents, validateMoneyArithmetic } from '../../src/domain/money.js';
import { completePrice, known, pkr, unknown } from './helpers.js';

test('strict PKR parsing converts accepted display forms to integer minor units', () => {
  for (const [input, expected] of [
    ['7000', 700_000],
    ['7,000', 700_000],
    ['Rs 7,000', 700_000],
    ['Rs. 7,000.5', 700_050],
    ['PKR 7,000.05', 700_005],
  ] as const) {
    const result = parsePkr(input);
    assert.equal(result.ok, true, input);
    if (result.ok) assert.equal(result.value.amountMinor, expected, input);
  }
});

test('ambiguous, excessive, scientific, negative, and overflowing amounts are rejected', () => {
  for (const input of [
    '7,00', '7 000', '7.000,00', '7,000.005', '1e3', '-1', '+1', 'PKR7,000',
    '01', '1,000,00', '1,000,000.01', 'USD 7,000', '', 'NaN',
  ]) {
    assert.equal(parsePkr(input).ok, false, input);
  }
  assert.equal(parsePkr('1,000,000').ok, true, 'the exact per-component maximum is allowed');
});

test('money objects enforce safe integer minor units, currency, minor unit, and positive item rule', () => {
  assert.equal(validateMoneyArithmetic(pkr(1), { positive: true }).ok, true);
  assert.equal(validateMoneyArithmetic(pkr(0), { positive: true }).ok, false);
  assert.equal(validateMoneyArithmetic({ amountMinor: 1.5, currency: 'PKR', minorUnit: 2 }).ok, false);
  assert.equal(validateMoneyArithmetic({ amountMinor: Number.MAX_SAFE_INTEGER + 1, currency: 'PKR', minorUnit: 2 }).ok, false);
  assert.equal(validateMoneyArithmetic({ amountMinor: -1, currency: 'PKR', minorUnit: 2 }).ok, false);
  assert.equal(validateMoneyArithmetic({ amountMinor: 100, currency: 'USD', minorUnit: 2 }).ok, false);
  assert.equal(validateMoneyArithmetic({ amountMinor: 100, currency: 'PKR', minorUnit: 0 }).ok, false);
});

test('a delivered total exists only when every required component and context is known', () => {
  const complete = summarizePriceComponents(completePrice());
  assert.equal(complete.deliveredEligible, true);
  assert.equal(complete.deliveredTotal?.amountMinor, 730_000);
  assert.deepEqual(complete.missing, []);

  const missingDelivery = completePrice();
  missingDelivery.shipping = unknown('Delivery was not entered');
  const incomplete = summarizePriceComponents(missingDelivery);
  assert.equal(incomplete.deliveredTotal, null);
  assert.equal(incomplete.knownSubtotal?.amountMinor, 700_000);
  assert.ok(incomplete.missing.includes('shipping'));

  const freeDelivery = completePrice();
  freeDelivery.shipping = known(pkr(0));
  const explicitFree = summarizePriceComponents(freeDelivery);
  assert.equal(explicitFree.deliveredTotal?.amountMinor, 700_000);
});

test('discounts are applied once only when separately evidenced and unconditional', () => {
  const separateDiscount = completePrice();
  separateDiscount.additionalDiscount = known({
    amount: pkr(100_000),
    alreadyIncluded: false,
    conditions: [],
  });
  assert.equal(summarizePriceComponents(separateDiscount).deliveredTotal?.amountMinor, 630_000);

  const cardDiscount = completePrice();
  cardDiscount.additionalDiscount = known({
    amount: pkr(100_000),
    alreadyIncluded: false,
    conditions: ['Named card required'],
  });
  const conditional = summarizePriceComponents(cardDiscount);
  assert.equal(conditional.deliveredTotal, null);
  assert.equal(conditional.knownSubtotal?.amountMinor, 730_000, 'conditional discount is not subtracted');
  assert.ok(conditional.issues.some(issue => issue.code === 'conditional_discount'));

  const unknownDiscount = completePrice();
  unknownDiscount.additionalDiscount = unknown('No separate discount was established');
  assert.equal(summarizePriceComponents(unknownDiscount).deliveredTotal, null);
});

test('inconsistent taxes, incomplete fees, mixed currencies, and excessive discounts block totals', () => {
  const tax = completePrice();
  tax.tax = known({ includedInItem: true, additional: pkr(10_000) });
  assert.ok(summarizePriceComponents(tax).issues.some(issue => issue.code === 'tax_included_with_additional_amount'));

  const fees = completePrice();
  fees.mandatoryFees = known({ items: [{ kind: 'cod', label: 'COD', amount: pkr(5_000) }], complete: false });
  assert.equal(summarizePriceComponents(fees).deliveredTotal, null);

  const currency = completePrice();
  currency.shipping = known({ amountMinor: 1, currency: 'USD' as 'PKR', minorUnit: 2 });
  assert.equal(summarizePriceComponents(currency).deliveredTotal, null);

  const excessive = completePrice(100_000);
  excessive.shipping = known(pkr(0));
  excessive.additionalDiscount = known({ amount: pkr(100_001), alreadyIncluded: false, conditions: [] });
  assert.ok(summarizePriceComponents(excessive).issues.some(issue => issue.code === 'discount_exceeds_subtotal'));
});
