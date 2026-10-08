import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distDirectory = join(projectRoot, 'dist');
const popupDirectory = join(distDirectory, 'ui', 'popup');
const scriptPath = join(popupDirectory, 'index.js');

// This script only replaces the generated dist child of this project.
if (dirname(distDirectory) !== projectRoot.replace(/[\\/]$/, '')) {
  throw new Error('Build output must stay inside the project.');
}

const manifest = JSON.parse(await readFile(join(projectRoot, 'src', 'manifest.json'), 'utf8'));
if (manifest.minimum_chrome_version !== '155') {
  throw new Error('Review the Chrome development target before changing the manifest minimum.');
}

const result = await build({
  absWorkingDir: projectRoot,
  entryPoints: ['src/ui/popup/index.ts'],
  outfile: scriptPath,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome155'],
  charset: 'utf8',
  legalComments: 'none',
  sourcemap: false,
  metafile: true,
  write: false,
  logLevel: 'warning'
});

if (result.outputFiles.length !== 1 || result.outputFiles[0].path !== scriptPath) {
  throw new Error('The foundation build must emit one packaged popup script.');
}
if (Object.values(result.metafile.outputs).some(output => output.imports.some(item => item.external))) {
  throw new Error('The popup must not depend on external executable imports.');
}

await rm(distDirectory, { recursive: true, force: true });
await mkdir(popupDirectory, { recursive: true });
for (const [source, destination] of [
  ['src/manifest.json', 'manifest.json'],
  ['src/ui/popup/index.html', 'ui/popup/index.html'],
  ['src/ui/popup/index.css', 'ui/popup/index.css']
]) {
  await copyFile(join(projectRoot, source), join(distDirectory, destination));
}
await writeFile(scriptPath, result.outputFiles[0].contents);
console.log('Built the private MV3 popup in dist/ (Chrome 155 target).');
