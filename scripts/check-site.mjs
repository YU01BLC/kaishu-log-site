import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const required = ['index.html', 'privacy/index.html', 'support/index.html', 'terms/index.html', '404.html', 'robots.txt', 'sitemap.xml', '.nojekyll', 'assets/styles.css', 'assets/favicon.svg'];
const forbidden = ['DEVELOPER_NAME', 'SUPPORT_EMAIL', 'PRIVACY_POLICY_URL', 'SUPPORT_URL', 'EFFECTIVE_DATE'].map(
  (name) => `{{${name}}}`,
);
const pages = ['index.html', 'privacy/index.html', 'support/index.html', 'terms/index.html', '404.html'];
const violations = [];

function walk(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => walk(join(path, entry.name)));
}

for (const file of required) if (!existsSync(join(root, file))) violations.push(`missing required file: ${file}`);
for (const file of walk(root)) {
  if (!/\.(html|css|xml|txt|svg|md|mjs)$/.test(file) && !file.endsWith('.nojekyll')) continue;
  const contents = readFileSync(file, 'utf8');
  for (const token of forbidden) if (contents.includes(token)) violations.push(`${relative(root, file)} contains ${token}`);
}
for (const page of pages) {
  const contents = readFileSync(join(root, page), 'utf8');
  for (const pattern of [/<html lang="ja">/i, /<meta name="viewport"/i, /<meta name="description"/i, /<link rel="canonical"/i, /<main[ >]/i, /<h1[ >]/i]) {
    if (!pattern.test(contents)) violations.push(`${page} is missing ${pattern}`);
  }
  const imageTags = [...contents.matchAll(/<img\b[^>]*>/gi)];
  for (const tag of imageTags) if (!/\balt="[^"]*"/i.test(tag[0])) violations.push(`${page} has an image without alt text`);
}
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
for (const url of ['https://yu01blc.github.io/kaishu-log-site/', 'https://yu01blc.github.io/kaishu-log-site/privacy/', 'https://yu01blc.github.io/kaishu-log-site/support/', 'https://yu01blc.github.io/kaishu-log-site/terms/']) {
  if (!sitemap.includes(url)) violations.push(`sitemap misses ${url}`);
}
if (violations.length) {
  console.error('Static-site check failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('Static-site, accessibility baseline, and placeholder checks passed.');
