import { strict as assert } from "node:assert";
import { readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { test } from "node:test";

// scripts/test.mjs runs these emitted tests with the project as its working directory.
const projectRoot = process.cwd();
const distRoot = join(projectRoot, "dist");
const packagedFiles = [
  "manifest.json",
  "ui/popup/index.css",
  "ui/popup/index.html",
  "ui/popup/index.js",
];

function record(value: unknown, label: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), label);
  return value as Record<string, unknown>;
}

async function jsonFile(path: string): Promise<Record<string, unknown>> {
  return record(JSON.parse(await readFile(path, "utf8")) as unknown, `${path} must contain an object`);
}

async function artifactFiles(directory = ""): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(join(distRoot, directory), { withFileTypes: true })) {
    const relativePath = posix.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Package must not contain a symlink: ${relativePath}`);
    if (entry.isDirectory()) {
      result.push(...await artifactFiles(relativePath));
    } else {
      assert.ok(entry.isFile(), `Unexpected package entry: ${relativePath}`);
      result.push(relativePath);
    }
  }
  return result.sort();
}

function localReference(reference: string, owner: string, files: readonly string[]): string {
  const value = reference.trim();
  assert.ok(value.length > 0, `Empty resource reference in ${owner}`);
  assert.doesNotMatch(value, /^(?:[a-z][a-z\d+.-]*:|\/\/)|\\/i, `Resource must be package-local: ${value}`);
  const resolved = new URL(value, `https://package.invalid/${owner}`);
  assert.equal(resolved.origin, "https://package.invalid", `External resource in ${owner}`);
  const relativePath = decodeURIComponent(resolved.pathname).replace(/^\//, "");
  assert.ok(files.includes(relativePath), `Missing packaged resource: ${owner} -> ${value}`);
  return relativePath;
}

function attributes(source: string): Map<string, string> {
  const result = new Map<string, string>();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    const name = match[1]!.toLowerCase();
    assert.ok(!result.has(name), `Duplicate HTML attribute: ${name}`);
    result.set(name, match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

test("release package stays within the Foundation capability boundary", async () => {
  assert.deepEqual(await artifactFiles(), packagedFiles, "Only the reviewed popup package belongs in dist");
  const manifest = await jsonFile(join(distRoot, "manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  // Unknown manifest capabilities require review at the next milestone, even if optional.
  const allowedKeys = new Set([
    "manifest_version", "name", "short_name", "version", "version_name", "description",
    "author", "minimum_chrome_version", "permissions", "action", "content_security_policy",
  ]);
  for (const key of Object.keys(manifest)) {
    assert.ok(allowedKeys.has(key), `Manifest capability is outside Foundation: ${key}`);
  }
  assert.equal(typeof manifest.minimum_chrome_version, "string");
  const minimumChrome = manifest.minimum_chrome_version as string;
  assert.match(minimumChrome, /^\d+(?:\.\d+){0,3}$/);
  assert.ok(Number(minimumChrome.split(".")[0]) >= 155, "Do not advertise support below the selected Chrome 155 target");

  const action = record(manifest.action, "An action popup is required");
  assert.equal(action.default_popup, "ui/popup/index.html");
  for (const key of Object.keys(action)) {
    assert.ok(["default_popup", "default_title"].includes(key), `Unexpected action setting: ${key}`);
  }
  const policy = record(manifest.content_security_policy, "An explicit extension CSP is required");
  assert.deepEqual(Object.keys(policy), ["extension_pages"]);
  assert.equal(typeof policy.extension_pages, "string");
  const directives = new Map<string, string[]>();
  const allowedDirectives = new Set([
    "default-src", "script-src", "script-src-elem", "script-src-attr", "style-src",
    "style-src-elem", "style-src-attr", "img-src", "font-src", "media-src", "connect-src",
    "object-src", "base-uri", "frame-src", "child-src", "worker-src", "form-action",
    "frame-ancestors", "manifest-src",
  ]);
  for (const raw of (policy.extension_pages as string).split(";")) {
    const [name, ...sources] = raw.trim().split(/\s+/);
    if (!name) continue;
    assert.ok(allowedDirectives.has(name), `Unexpected CSP directive: ${name}`);
    assert.ok(!directives.has(name), `Duplicate CSP directive: ${name}`);
    assert.ok(sources.length === 1 && ["'self'", "'none'"].includes(sources[0]!), `CSP must stay package-local: ${raw}`);
    directives.set(name, sources);
  }
  assert.deepEqual(directives.get("script-src"), ["'self'"]);
  assert.deepEqual(directives.get("connect-src"), ["'none'"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
});

test("popup HTML and CSS reference only files present in the package", async () => {
  const files = await artifactFiles();
  const htmlOwner = "ui/popup/index.html";
  const html = (await readFile(join(distRoot, htmlOwner), "utf8")).replace(/<!--[\s\S]*?-->/g, "");
  const scriptBlocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  assert.ok(scriptBlocks.length > 0, "Popup must load its packaged JavaScript");
  assert.equal(scriptBlocks.length, [...html.matchAll(/<script\b/gi)].length, "Every script must have a complete closing tag");
  for (const block of scriptBlocks) {
    const source = attributes(block[1]!).get("src");
    assert.ok(source, "Inline scripts are prohibited");
    assert.equal(localReference(source, htmlOwner, files), "ui/popup/index.js");
    assert.equal(block[2]!.trim(), "", "A packaged script must not also contain inline code");
  }
  let stylesheetCount = 0;
  for (const tag of html.matchAll(/<([a-z][a-z\d:-]*)\b([^<>]*?)\/?>/gi)) {
    const name = tag[1]!.toLowerCase();
    const attrs = attributes(tag[2]!);
    assert.ok(!["base", "iframe", "object", "embed"].includes(name), `Unreviewed popup surface: ${name}`);
    for (const [attribute, value] of attrs) {
      assert.ok(!/^on/i.test(attribute), `Inline event handler is prohibited: ${attribute}`);
      assert.ok(!["srcdoc", "style"].includes(attribute), `Inline executable/presentation content is prohibited: ${attribute}`);
      if (["src", "href", "action", "formaction", "poster", "data", "background"].includes(attribute)) {
        localReference(value, htmlOwner, files);
      }
      if (attribute === "srcset") {
        for (const candidate of value.split(",")) {
          localReference(candidate.trim().split(/\s+/)[0] ?? "", htmlOwner, files);
        }
      }
    }
    assert.ok(!(name === "meta" && attrs.get("http-equiv")?.toLowerCase() === "refresh"), "Meta refresh is outside the local popup boundary");
    if (name === "link" && attrs.get("rel")?.toLowerCase().split(/\s+/).includes("stylesheet")) {
      assert.equal(localReference(attrs.get("href") ?? "", htmlOwner, files), "ui/popup/index.css");
      stylesheetCount++;
    }
  }
  assert.ok(stylesheetCount > 0, "Popup must load its packaged stylesheet");
  assert.doesNotMatch(html, /<style\b/i, "Styles belong in the packaged CSS file");
  const cssOwner = "ui/popup/index.css";
  const css = (await readFile(join(distRoot, cssOwner), "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(css, /@import\b/i, "The single Foundation stylesheet must not import other stylesheets");
  const cssUrls = [...css.matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)];
  assert.equal(cssUrls.length, [...css.matchAll(/\burl\s*\(/gi)].length, "Every CSS URL must be inspectable");
  for (const url of cssUrls) localReference(url[1] ?? url[2] ?? url[3] ?? "", cssOwner, files);
});

test("bundled JavaScript contains no common network or dynamic-code mechanisms", async () => {
  const javascript = await readFile(join(distRoot, "ui/popup/index.js"), "utf8");
  assert.ok(javascript.trim().length > 0, "The popup bundle must not be empty");
  // These bounded token checks catch ordinary scope regressions in this small,
  // reviewed bundle. They do not prove absence of aliases, computed properties,
  // encoded payloads, runtime requests, or malicious code; installed tests and
  // release review remain separate gates.
  const prohibited = [
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/,
    /\b(?:Worker|SharedWorker|importScripts)\s*\(/,
    /\b(?:eval|Function)\s*\(/,
    /\bimport\s*(?:\(|[\{"'*]|[a-z_$][\w$]*\s*(?:,|\s+from\b))/i,
    /\bexport\s+(?:\*|\{[^}]*\})\s+from\b/,
    /\b(?:https?|wss?):\/\//i,
  ];
  for (const pattern of prohibited) {
    assert.doesNotMatch(javascript, pattern, `Unreviewed network/code-loading mechanism: ${pattern}`);
  }
});

test("development tools are exact pins reproduced by the npm lockfile", async () => {
  const packageJson = await jsonFile(join(projectRoot, "package.json"));
  const scripts = record(packageJson.scripts, "Foundation scripts must exist");
  for (const name of ["build", "test", "typecheck"]) {
    assert.equal(typeof scripts[name], "string", `Missing ${name} script`);
    assert.ok((scripts[name] as string).trim().length > 0, `${name} script must not be empty`);
    assert.doesNotMatch(scripts[name] as string, /^\s*(?:echo\b|true\s*$|exit\s+0\s*$)/i, `${name} must execute a real tool`);
  }
  const dependencies = record(packageJson.devDependencies, "Development tools must be declared");
  for (const name of ["typescript", "esbuild", "@types/chrome", "@types/node"]) {
    assert.ok(Object.hasOwn(dependencies, name), `Missing Foundation development tool: ${name}`);
  }
  const lock = await jsonFile(join(projectRoot, "package-lock.json"));
  assert.equal(lock.lockfileVersion, 3);
  const packages = record(lock.packages, "npm lockfile must contain package records");
  const rootPackage = record(packages[""], "Lockfile root package must exist");
  assert.deepEqual(rootPackage.devDependencies, dependencies, "Lockfile must reproduce the declared development pins");
  for (const [name, version] of Object.entries(dependencies)) {
    assert.equal(typeof version, "string");
    assert.match(version as string, /^\d+\.\d+\.\d+(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?$/i, `Use an exact version for ${name}`);
    const locked = record(packages[`node_modules/${name}`], `Missing lock entry: ${name}`);
    assert.equal(locked.version, version, `Lock version differs for ${name}`);
    assert.equal(typeof locked.integrity, "string", `Missing registry integrity for ${name}`);
    assert.match(locked.integrity as string, /^sha(?:256|384|512)-[a-z\d+/]+=*$/i, `Invalid integrity for ${name}`);
    assert.equal(typeof locked.resolved, "string", `Missing resolved package for ${name}`);
    assert.equal(new URL(locked.resolved as string).origin, "https://registry.npmjs.org", `Use official npm package provenance for ${name}`);
  }
});
