import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const benchmarkDirectory = join(projectRoot, 'fixtures', 'benchmark');

const brands = ['Northstar Input', 'Juniper Devices', 'Indigo Peripherals', 'Crescent Works'];
const colors = ['Graphite', 'Pearl', 'Sage', 'Indigo'];
const packs = [
  'Bluetooth and USB receiver; single unit',
  'USB receiver; single unit',
  'Bluetooth; single unit',
  'Bluetooth and USB receiver; mouse with travel pouch',
];

function clone(value) {
  return structuredClone(value);
}

function baseFacts(splitCode, familyNumber) {
  const index = familyNumber - 1;
  const familyCode = `${splitCode}${String(familyNumber).padStart(2, '0')}`;
  return {
    brand: brands[index % brands.length],
    modelFamily: `Synthetic Aster ${familyCode}`,
    model: `Aster ${familyCode} Standard`,
    mpn: `SYN-${familyCode}-STD`,
    gtin: null,
    size: index % 2 === 0 ? 'small_medium' : 'large',
    handedness: index % 3 === 0 ? 'ambidextrous' : 'right',
    color: colors[index % colors.length],
    region: 'PK test region',
    receiverOrPack: packs[index % packs.length],
    identityStatus: 'user_entered',
    seller: 'Fictional Cedar Seller',
    condition: 'new',
    warranty: {
      provider: brands[index % brands.length],
      kind: 'manufacturer',
      months: 12,
      scope: 'Parts and labor',
    },
    eligibility: 'public',
    eligibilityDetails: [],
    stock: 'in_stock',
    itemMinor: 500_000 + index * 5_000,
    shippingMinor: 25_000,
  };
}

const mismatchLabels = [
  'model and manufacturer part number', 'manufacturer part number', 'size', 'handedness',
  'receiver or connectivity pack', 'region', 'color', 'condition', 'warranty', 'eligibility',
];

function mutateMismatch(right, kind, familyCode) {
  switch (kind) {
    case 0:
      right.model = `${right.model} L`;
      right.mpn = `SYN-${familyCode}-L`;
      break;
    case 1:
      right.mpn = `SYN-${familyCode}-ALT`;
      break;
    case 2:
      right.size = right.size === 'large' ? 'small_medium' : 'large';
      break;
    case 3:
      right.handedness = right.handedness === 'left' ? 'right' : 'left';
      break;
    case 4:
      right.receiverOrPack = 'Bluetooth only; two-unit pack';
      break;
    case 5:
      right.region = 'EU synthetic test region';
      break;
    case 6:
      right.color = right.color === 'Graphite' ? 'Pearl' : 'Graphite';
      break;
    case 7:
      right.condition = 'refurbished';
      break;
    case 8:
      right.warranty = { provider: 'Fictional Seller', kind: 'seller', months: 6, scope: 'Carry-in repair' };
      break;
    case 9:
      right.eligibility = 'conditional';
      right.eligibilityDetails = ['Named synthetic card required'];
      break;
    default:
      throw new Error(`Unknown mismatch kind ${kind}`);
  }
}

const insufficientLabels = [
  'manufacturer identifier', 'size', 'condition', 'warranty', 'seller identity',
];

function mutateInsufficient(left, right, kind) {
  switch (kind) {
    case 0:
      left.mpn = null;
      right.mpn = null;
      left.gtin = null;
      right.gtin = null;
      break;
    case 1:
      right.size = null;
      break;
    case 2:
      right.condition = null;
      break;
    case 3:
      right.warranty = null;
      break;
    case 4:
      right.seller = null;
      break;
    default:
      throw new Error(`Unknown insufficient kind ${kind}`);
  }
}

function casesForFamily(split, familyNumber) {
  const splitCode = split === 'development' ? 'D' : 'H';
  const familyCode = `${splitCode}${String(familyNumber).padStart(2, '0')}`;
  const base = baseFacts(splitCode, familyNumber);
  const pair = (suffix, expected, rationale, left, right) => ({
    id: `${splitCode.toLowerCase()}-${String(familyNumber).padStart(2, '0')}-${suffix}`,
    modelFamily: base.modelFamily,
    provenance: 'synthetic_owned',
    expected,
    criticalConflict: expected === 'mismatch',
    rationale,
    left,
    right,
  });

  const comparableOneLeft = clone(base);
  const comparableOneRight = clone(base);
  comparableOneRight.seller = 'Fictional Willow Seller';
  comparableOneRight.itemMinor += 10_000;

  const comparableTwoLeft = clone(base);
  const comparableTwoRight = clone(base);
  comparableTwoLeft.shippingMinor = null;
  comparableTwoRight.shippingMinor = null;
  comparableTwoRight.seller = 'Fictional Willow Seller';
  comparableTwoRight.stock = familyNumber % 2 === 0 ? 'out_of_stock' : 'in_stock';

  const mismatchKindOne = ((familyNumber - 1) * 2) % mismatchLabels.length;
  const mismatchKindTwo = (mismatchKindOne + 1) % mismatchLabels.length;
  const mismatchOneLeft = clone(base);
  const mismatchOneRight = clone(base);
  mutateMismatch(mismatchOneRight, mismatchKindOne, familyCode);
  const mismatchTwoLeft = clone(base);
  const mismatchTwoRight = clone(base);
  mutateMismatch(mismatchTwoRight, mismatchKindTwo, familyCode);

  const insufficientKind = (familyNumber - 1) % insufficientLabels.length;
  const insufficientLeft = clone(base);
  const insufficientRight = clone(base);
  mutateInsufficient(insufficientLeft, insufficientRight, insufficientKind);

  return [
    pair('c1', 'comparable', 'Same evidenced variant and core terms; different fictional sellers are allowed.', comparableOneLeft, comparableOneRight),
    pair('c2', 'comparable', 'Same variant and terms; delivery is intentionally unknown and stock is evaluated separately.', comparableTwoLeft, comparableTwoRight),
    pair('m1', 'mismatch', `Material ${mismatchLabels[mismatchKindOne]} conflict.`, mismatchOneLeft, mismatchOneRight),
    pair('m2', 'mismatch', `Material ${mismatchLabels[mismatchKindTwo]} conflict.`, mismatchTwoLeft, mismatchTwoRight),
    pair('u1', 'insufficient_evidence', `${insufficientLabels[insufficientKind]} evidence is intentionally absent without a conflicting value.`, insufficientLeft, insufficientRight),
  ];
}

function makeSplit(name, families) {
  return Array.from({ length: families }, (_, index) => casesForFamily(name, index + 1)).flat();
}

function jsonl(records) {
  return `${records.map(record => JSON.stringify(record)).join('\n')}\n`;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const development = makeSplit('development', 24);
const holdout = makeSplit('holdout', 16);
const developmentText = jsonl(development);
const holdoutText = jsonl(holdout);
const classCounts = records => Object.fromEntries(['comparable', 'mismatch', 'insufficient_evidence'].map(
  expected => [expected, records.filter(record => record.expected === expected).length],
));
const families = records => [...new Set(records.map(record => record.modelFamily))];

const splits = {
  schemaVersion: 1,
  provenance: 'synthetic_owned',
  frozenAt: '2026-10-08',
  development: {
    file: 'development.jsonl',
    sha256: sha256(developmentText),
    records: development.length,
    classes: classCounts(development),
    families: families(development),
  },
  holdout: {
    file: 'holdout.jsonl',
    sha256: sha256(holdoutText),
    records: holdout.length,
    classes: classCounts(holdout),
    families: families(holdout),
  },
};

await mkdir(benchmarkDirectory, { recursive: true });
await writeFile(join(benchmarkDirectory, 'development.jsonl'), developmentText);
await writeFile(join(benchmarkDirectory, 'holdout.jsonl'), holdoutText);
await writeFile(join(benchmarkDirectory, 'splits.json'), `${JSON.stringify(splits, null, 2)}\n`);
console.log(`Generated ${development.length} development and ${holdout.length} holdout synthetic pairs.`);
