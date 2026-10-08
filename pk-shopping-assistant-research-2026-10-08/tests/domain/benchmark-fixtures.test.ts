import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { evaluateBenchmark, parseBenchmarkJsonl } from '../../src/domain/benchmark.js';

const projectRoot = process.cwd();
const fixtureRoot = join(projectRoot, 'fixtures', 'benchmark');
const hash = (content: string): string => createHash('sha256').update(content).digest('hex');

interface SplitMetadata {
  file: string;
  sha256: string;
  records: number;
  classes: Record<string, number>;
  families: string[];
}

interface Splits {
  schemaVersion: number;
  provenance: string;
  development: SplitMetadata;
  holdout: SplitMetadata;
}

async function splits(): Promise<Splits> {
  return JSON.parse(await readFile(join(fixtureRoot, 'splits.json'), 'utf8')) as Splits;
}

test('development benchmark has the frozen 120-case composition and synthetic provenance', async () => {
  const metadata = await splits();
  const content = await readFile(join(fixtureRoot, metadata.development.file), 'utf8');
  assert.equal(hash(content), metadata.development.sha256);
  const pairs = parseBenchmarkJsonl(content, metadata.development.file);
  assert.equal(pairs.length, 120);
  assert.deepEqual(
    Object.fromEntries(['comparable', 'mismatch', 'insufficient_evidence'].map(
      expected => [expected, pairs.filter(pair => pair.expected === expected).length],
    )),
    { comparable: 48, mismatch: 48, insufficient_evidence: 24 },
  );
  assert.equal(new Set(pairs.map(pair => pair.modelFamily)).size, 24);
  assert.ok(pairs.every(pair => pair.provenance === 'synthetic_owned'));
  for (const family of metadata.development.families) {
    assert.equal(pairs.filter(pair => pair.modelFamily === family).length, 5, family);
  }
});

test('routine fixture checks treat holdout labels as opaque frozen bytes', async () => {
  const metadata = await splits();
  assert.equal(metadata.schemaVersion, 1);
  assert.equal(metadata.provenance, 'synthetic_owned');
  assert.deepEqual(metadata.holdout.classes, { comparable: 32, mismatch: 32, insufficient_evidence: 16 });
  assert.equal(metadata.holdout.families.length, 16);
  assert.equal(metadata.development.families.length, 24);
  assert.equal(
    metadata.development.families.filter(family => metadata.holdout.families.includes(family)).length,
    0,
    'manufacturer/model families must not leak across splits',
  );

  // Do not JSON.parse this content or inspect expected labels in routine tests.
  const opaqueHoldout = await readFile(join(fixtureRoot, metadata.holdout.file), 'utf8');
  assert.equal(hash(opaqueHoldout), metadata.holdout.sha256);
  assert.equal(opaqueHoldout.split(/\r?\n/).filter(line => line.length > 0).length, 80);
});

test('development rules reproduce authored classes without conflating ranking', async () => {
  const metadata = await splits();
  const pairs = parseBenchmarkJsonl(
    await readFile(join(fixtureRoot, metadata.development.file), 'utf8'),
    metadata.development.file,
  );
  const metrics = evaluateBenchmark(pairs);
  assert.equal(metrics.population, 'synthetic');
  assert.deepEqual(metrics.misclassified, []);
  assert.deepEqual(metrics.criticalFalsePositives, []);
  assert.equal(metrics.predictedComparableCorrect, 48);
  assert.equal(metrics.predictedComparableDenominator, 48);
  assert.equal(metrics.comparableRecallCorrect, 48);
  assert.equal(metrics.comparableRecallDenominator, 48);
  assert.equal(metrics.abstentionCount, 24);
  assert.equal(metrics.rankingEligibleCount, 24, 'unknown shipping/stock are separate delivered-ranking gates');
});

test('routine commands cannot accidentally invoke the explicit holdout evaluation', async () => {
  const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  assert.equal(packageJson.scripts.benchmark, 'node scripts/benchmark.mjs development');
  assert.equal(packageJson.scripts['benchmark:holdout'], 'node scripts/benchmark.mjs holdout');
  assert.doesNotMatch(packageJson.scripts.test ?? '', /benchmark(?::holdout)?/i);
  const runner = await readFile(join(projectRoot, 'scripts', 'test.mjs'), 'utf8');
  assert.doesNotMatch(runner, /benchmark:holdout|holdout\.jsonl/i);
});

test('standalone examples are visibly synthetic and use non-operational links', async () => {
  const fixture = JSON.parse(await readFile(join(projectRoot, 'fixtures', 'synthetic', 'examples.json'), 'utf8')) as {
    provenance: string;
    notice: string;
    examples: Array<{ url: string }>;
  };
  assert.equal(fixture.provenance, 'synthetic_owned');
  assert.match(fixture.notice, /fictional/i);
  assert.ok(fixture.examples.length >= 3);
  assert.ok(fixture.examples.every(example => new URL(example.url).hostname.endsWith('.invalid')));
});
