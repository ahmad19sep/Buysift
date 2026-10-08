import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { createLocalAccessRecord, localSourceMatchesAccess } from '../../src/domain/provenance.js';
import {
  ValidationError,
  sanitizeProductUrl,
  validateAccessRecord,
  validateMoney,
  validateObservation,
  validateObservationAgainstAccess,
  validateOffer,
  validatePriceComponents,
  validateProduct,
} from '../../src/domain/validation.js';
import { completePrice, makeObservation, pkr, testUuid, unknown } from './helpers.js';

test('runtime validation rejects unexpected fields and hostile prototypes', () => {
  const product = {
    id: testUuid(1),
    category: 'wireless_mouse',
    brand: 'Fictional Northstar',
    modelFamily: 'Aster One',
  };
  assert.equal(validateProduct(product).brand, 'Fictional Northstar');
  assert.throws(() => validateProduct({ ...product, unexpected: true }), ValidationError);

  const inherited = Object.assign(Object.create({ polluted: true }) as Record<string, unknown>, product);
  assert.throws(() => validateProduct(inherited), /untrusted prototype/);

  const ownPrototypeKey = JSON.parse(JSON.stringify({ ...product }).replace(/}$/, ',"__proto__":{"polluted":true}}')) as unknown;
  assert.throws(() => validateProduct(ownPrototypeKey), /unexpected field/);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});

test('bounded text stays inert data and oversized/control values fail', () => {
  const htmlLike = {
    id: testUuid(1),
    category: 'wireless_mouse',
    brand: '<img src=x onerror=alert(1)>',
    modelFamily: 'Aster One',
  };
  assert.equal(validateProduct(htmlLike).brand, htmlLike.brand, 'domain validation preserves text; UI must use text rendering');
  assert.throws(() => validateProduct({ ...htmlLike, brand: 'x'.repeat(181) }), /180/);
  assert.throws(() => validateProduct({ ...htmlLike, brand: 'line\nbreak' }), /control characters/);
});

test('product URLs are HTTPS public references with an explicit query allowlist', () => {
  assert.equal(
    sanitizeProductUrl('https://shop.example.invalid/products/mouse?variant=graphite&utm_source=test#details', {
      identityQueryParameters: ['variant'],
    }),
    'https://shop.example.invalid/products/mouse?variant=graphite',
  );
  assert.equal(
    sanitizeProductUrl('https://shop.example.invalid/products/mouse?variant=graphite&utm_source=test#details'),
    'https://shop.example.invalid/products/mouse',
    'query data is stripped when no merchant identity allowlist exists',
  );
  for (const unsafe of [
    'http://shop.example.invalid/products/mouse',
    'https://user:secret@shop.example.invalid/products/mouse',
    'https://localhost/products/mouse',
    'https://127.0.0.1/products/mouse',
    'https://192.168.1.10/products/mouse',
    'https://[::1]/products/mouse',
    'https://shop.example.invalid/cart',
    'https://shop.example.invalid/ch%65ckout/payment',
    'javascript:alert(1)',
  ]) {
    assert.throws(() => sanitizeProductUrl(unsafe), ValidationError, unsafe);
  }
});

test('offer and price validation preserve explicit unknowns but reject false money defaults', () => {
  const observation = makeObservation(1, '2026-10-08T09:00:00.000Z');
  const offer = structuredClone(observation.offerContextSnapshot);
  offer.canonicalUrl = 'https://cedar.example.invalid/products/aster?color=graphite&utm_source=test#buy';
  offer.selectedOptionIds = { color: 'graphite' };
  const parsed = validateOffer(offer);
  assert.equal(parsed.canonicalUrl, 'https://cedar.example.invalid/products/aster');
  assert.equal(parsed.selectedOptionIds.color, 'graphite', 'selected identity remains explicit after query stripping');

  const incomplete = completePrice();
  incomplete.shipping = unknown('Delivery was not entered');
  assert.equal(validatePriceComponents(incomplete).shipping.state, 'unknown');
  assert.throws(() => validatePriceComponents({ ...completePrice(), item: pkr(0) }), /from 1/);
  const excessiveDiscount = completePrice(100_000);
  excessiveDiscount.shipping = { state: 'known', value: pkr(0), basis: 'Synthetic', sourceRef: 'synthetic:test' };
  excessiveDiscount.additionalDiscount = {
    state: 'known',
    value: { amount: pkr(100_001), alreadyIncluded: false, conditions: [] },
    basis: 'Synthetic',
    sourceRef: 'synthetic:test',
  };
  assert.throws(() => validatePriceComponents(excessiveDiscount), /eligible known subtotal/);
  assert.throws(() => validateMoney({ amountMinor: 100_000_001, currency: 'PKR', minorUnit: 2 }), /100000000/);
  assert.throws(() => validateMoney({ amountMinor: 100, currency: 'USD', minorUnit: 2 }), /PKR/);
});

test('immutable observation snapshots must agree on IDs and revisions', () => {
  const observation = makeObservation(1, '2026-10-08T09:00:00.000Z');
  const parsed = validateObservation(observation);
  assert.equal(parsed.offerId, observation.offerId);

  const wrongProduct = structuredClone(observation);
  wrongProduct.identitySnapshot.productId = testUuid(999);
  assert.throws(() => validateObservation(wrongProduct), /identity snapshot/);

  const wrongRevision = structuredClone(observation);
  wrongRevision.offerContextSnapshot.contextRevision = 2;
  assert.throws(() => validateObservation(wrongRevision), /revisions/);

  const extraNestedField = structuredClone(observation) as unknown as Record<string, unknown>;
  (extraNestedField.productSnapshot as Record<string, unknown>).script = '<script>bad()</script>';
  assert.throws(() => validateObservation(extraNestedField), /unexpected field/);

  const fakeCheck = structuredClone(observation);
  fakeCheck.checkedAt = fakeCheck.observedAt;
  assert.throws(() => validateObservation(fakeCheck), /cannot claim a source check/);
});

test('local provenance declarations cannot acquire merchant or public permissions', () => {
  const synthetic = createLocalAccessRecord(testUuid(6), 'synthetic_owned');
  const manual = createLocalAccessRecord(testUuid(11), 'personal_manual');
  assert.equal(validateAccessRecord(synthetic).kind, 'synthetic_owned');
  assert.equal(localSourceMatchesAccess('synthetic', synthetic), true);
  assert.equal(localSourceMatchesAccess('manual', synthetic), false);
  assert.equal(localSourceMatchesAccess('manual', manual), true);
  const observation = makeObservation(2, '2026-10-08T09:00:00.000Z');
  assert.equal(validateObservationAgainstAccess(observation, synthetic).id, observation.id);
  assert.throws(() => validateObservationAgainstAccess(observation, manual), /does not match/);

  const expanded = structuredClone(synthetic);
  expanded.allowedUses.push('public_history');
  assert.throws(() => validateAccessRecord(expanded), /fixed manual, local-only purpose/);

  const emptyGrant = { ...structuredClone(synthetic), kind: 'written_grant', state: 'active' };
  assert.throws(() => validateAccessRecord(emptyGrant), /explicit methods/);
});
