import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const emittedDirectory = join(projectRoot, '.test-dist');
const mode = process.argv[2] ?? 'development';
if (mode !== 'development' && mode !== 'holdout') {
  throw new Error('Benchmark mode must be development or holdout.');
}
if (dirname(emittedDirectory) !== projectRoot.replace(/[\\/]$/, '')) {
  throw new Error('Benchmark compilation output must stay inside the project.');
}
await rm(emittedDirectory, { recursive: true, force: true });

const compiler = spawnSync(process.execPath, [
  'node_modules/typescript/bin/tsc', '--project', 'tsconfig.test.json',
], { cwd: projectRoot, stdio: 'inherit', windowsHide: true });
if (compiler.error) throw compiler.error;
if (compiler.status !== 0) process.exit(compiler.status ?? 1);

const splitMetadata = JSON.parse(await readFile(join(projectRoot, 'fixtures', 'benchmark', 'splits.json'), 'utf8'));
const selectedMetadata = splitMetadata[mode];
if (selectedMetadata === undefined || typeof selectedMetadata.file !== 'string' || typeof selectedMetadata.sha256 !== 'string') {
  throw new Error(`Missing frozen metadata for ${mode}.`);
}
const selectedPath = join(projectRoot, 'fixtures', 'benchmark', selectedMetadata.file);
const content = await readFile(selectedPath, 'utf8');
const actualHash = createHash('sha256').update(content).digest('hex');
if (actualHash !== selectedMetadata.sha256) {
  throw new Error(`${mode} fixture hash changed: expected ${selectedMetadata.sha256}, received ${actualHash}.`);
}

const compiledModuleUrl = pathToFileURL(join(emittedDirectory, 'src', 'domain', 'benchmark.js')).href;
const { evaluateBenchmark, parseBenchmarkJsonl } = await import(compiledModuleUrl);
const pairs = parseBenchmarkJsonl(content, selectedMetadata.file);
if (pairs.length !== selectedMetadata.records) throw new Error(`${mode} record count differs from the frozen split metadata.`);
const metrics = evaluateBenchmark(pairs);
const ratio = (numerator, denominator) => denominator === 0 ? null : numerator / denominator;
const report = {
  population: metrics.population,
  fixture: selectedMetadata.file,
  sha256: actualHash,
  total: metrics.total,
  confusionMatrix: metrics.confusionMatrix,
  predictedComparablePrecision: {
    numerator: metrics.predictedComparableCorrect,
    denominator: metrics.predictedComparableDenominator,
    ratio: ratio(metrics.predictedComparableCorrect, metrics.predictedComparableDenominator),
  },
  comparableRecall: {
    numerator: metrics.comparableRecallCorrect,
    denominator: metrics.comparableRecallDenominator,
    ratio: ratio(metrics.comparableRecallCorrect, metrics.comparableRecallDenominator),
  },
  coverage: {
    numerator: metrics.classifiedCount,
    denominator: metrics.total,
    ratio: ratio(metrics.classifiedCount, metrics.total),
  },
  abstention: {
    numerator: metrics.abstentionCount,
    denominator: metrics.total,
    ratio: ratio(metrics.abstentionCount, metrics.total),
  },
  deliveredRankingEligible: metrics.rankingEligibleCount,
  criticalFalsePositives: metrics.criticalFalsePositives,
  misclassified: metrics.misclassified,
  interpretation: 'Synthetic rule-regression evidence only; this is not measured market accuracy.',
};
console.log(JSON.stringify(report, null, 2));
if (metrics.misclassified.length !== 0 || metrics.criticalFalsePositives.length !== 0) process.exitCode = 1;
