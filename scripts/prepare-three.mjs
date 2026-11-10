import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const files = ['build/three.module.js', 'build/three.core.js', 'examples/jsm/controls/OrbitControls.js', 'examples/jsm/renderers/CSS3DRenderer.js', 'LICENSE'];
for (const file of files) {
  const target = new URL(`website/vendor/three/${file}`, root);
  await mkdir(fileURLToPath(new URL('.', target)), { recursive: true });
  await cp(new URL(`node_modules/three/${file}`, root), target);
}

const { build } = await import('esbuild');
await build({ entryPoints: [fileURLToPath(new URL('website/spatial-workspace.js', root))], bundle: true, format: 'iife', globalName: 'PortfolioSpatial', minify: true, outfile: fileURLToPath(new URL('website/vendor/spatial-workspace.bundle.js', root)) });

// Invalidate browser caches whenever the generated Workspace code changes.
const bundleUrl = new URL('website/vendor/spatial-workspace.bundle.js', root);
const version = createHash('sha256').update(await readFile(bundleUrl)).digest('hex').slice(0, 12);
const indexUrl = new URL('website/index.html', root);
const html = await readFile(indexUrl, 'utf8');
const updated = html.replace(/spatial-workspace\.bundle\.js\?v=[^"\s]+/, `spatial-workspace.bundle.js?v=${version}`);
if (updated !== html) await writeFile(indexUrl, updated);
