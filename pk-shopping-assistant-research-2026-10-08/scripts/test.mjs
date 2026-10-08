import { spawnSync } from 'node:child_process';
import { readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const testDirectory = join(projectRoot, '.test-dist');

// Only the generated test-output child may be removed.
if (dirname(testDirectory) !== projectRoot.replace(/[\\/]$/, '')) {
  throw new Error('Test output must stay inside the project.');
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function findTests(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await findTests(path));
    else if (entry.isFile() && entry.name.endsWith('.test.js')) results.push(path);
  }
  return results.sort();
}

// Package-policy tests always inspect a freshly rebuilt artifact.
runNode(['scripts/build.mjs']);
await rm(testDirectory, { recursive: true, force: true });
runNode(['node_modules/typescript/bin/tsc', '--project', 'tsconfig.test.json']);
const tests = await findTests(join(testDirectory, 'tests'));
if (tests.length === 0) throw new Error('No compiled tests were found; an empty suite is not a pass.');
runNode(['--test', ...tests]);
