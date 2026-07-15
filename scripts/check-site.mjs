import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const required = [
  "index.html",
  "privacy/index.html",
  "support/index.html",
  "terms/index.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
  "assets/styles.css",
  "assets/favicon.svg",
];
const forbidden = [
  "DEVELOPER_NAME",
  "SUPPORT_EMAIL",
  "PRIVACY_POLICY_URL",
  "SUPPORT_URL",
  "EFFECTIVE_DATE",
].map((name) => `{{${name}}}`);
const pages = [
  "index.html",
  "privacy/index.html",
  "support/index.html",
  "terms/index.html",
  "404.html",
];
const violations = [];
const siteUrl = "https://yu01blc.github.io/kaishu-log-site/";
const publicPages = {
  [siteUrl]: "index.html",
  [`${siteUrl}privacy/`]: "privacy/index.html",
  [`${siteUrl}support/`]: "support/index.html",
  [`${siteUrl}terms/`]: "terms/index.html",
};
const supportMailSubject = "回収ログについてのお問い合わせ";
const supportMailBody = [
  "端末名：",
  "OSバージョン：",
  "アプリバージョン：",
  "問題が発生した画面：",
  "再現手順：",
  "表示されたエラー：",
  "お問い合わせ内容：",
].join("\n");
const supportMailto = `mailto:kaishulog.support@gmail.com?subject=${encodeURIComponent(supportMailSubject)}&body=${encodeURIComponent(supportMailBody)}`;

function walk(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    walk(join(path, entry.name)),
  );
}

for (const file of required)
  if (!existsSync(join(root, file)))
    violations.push(`missing required file: ${file}`);
for (const file of walk(root)) {
  if (
    !/\.(html|css|xml|txt|svg|md|mjs)$/.test(file) &&
    !file.endsWith(".nojekyll")
  )
    continue;
  const contents = readFileSync(file, "utf8");
  for (const token of forbidden)
    if (contents.includes(token))
      violations.push(`${relative(root, file)} contains ${token}`);
}
for (const page of pages) {
  const contents = readFileSync(join(root, page), "utf8");
  for (const pattern of [
    /<html\s+lang="ja"/i,
    /<meta\b[^>]*\bname="viewport"/i,
    /<meta\b[^>]*\bname="description"/i,
    /<link\b(?=[^>]*\brel="canonical")[^>]*>/i,
    /<main[ >]/i,
    /<h1[ >]/i,
  ]) {
    if (!pattern.test(contents))
      violations.push(`${page} is missing ${pattern}`);
  }
  const imageTags = [...contents.matchAll(/<img\b[^>]*>/gi)];
  for (const tag of imageTags)
    if (!/\balt="[^"]*"/i.test(tag[0]))
      violations.push(`${page} has an image without alt text`);

  const hrefs = [...contents.matchAll(/\bhref="([^"]+)"/gi)].map((match) =>
    match[1].replaceAll("&amp;", "&"),
  );
  for (const href of hrefs) {
    if (!href.startsWith(siteUrl)) continue;
    const sitePath = new URL(href).pathname.replace(/^\/kaishu-log-site\//, "");
    const target = join(root, sitePath || "index.html");
    if (!publicPages[href] && !existsSync(target))
      violations.push(`${page} links to an unknown internal URL: ${href}`);
  }
}
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
for (const url of [
  "https://yu01blc.github.io/kaishu-log-site/",
  "https://yu01blc.github.io/kaishu-log-site/privacy/",
  "https://yu01blc.github.io/kaishu-log-site/support/",
  "https://yu01blc.github.io/kaishu-log-site/terms/",
]) {
  if (!sitemap.includes(url)) violations.push(`sitemap misses ${url}`);
}
for (const page of [
  "support/index.html",
  "privacy/index.html",
  "terms/index.html",
]) {
  const contents = readFileSync(join(root, page), "utf8");
  const mailtos = [...contents.matchAll(/href="(mailto:[^"]+)"/gi)].map(
    (match) => match[1].replaceAll("&amp;", "&"),
  );
  if (!mailtos.includes(supportMailto))
    violations.push(`${page} does not use the canonical support mailto`);
}
for (const [page, requiredText] of Object.entries({
  "support/index.html": [
    "バックアップを出力する",
    "バックアップを復元する",
    "現在の記録、ラベル、復元対象の設定が上書きされます",
    "全データを削除する",
    "テーマを変更する",
    "よくある質問",
    "パスワードや認証情報は送らないでください",
    "個人情報は必要以上に記載しないでください",
    "必要性を確認せずに添付しないでください",
  ],
  "privacy/index.html": [
    "ユーザー登録・ログインを提供せず",
    "クラウド同期を行いません",
    "開発者サーバーを使用しません",
    "位置情報、連絡先、写真、カメラ、マイク、広告識別子を取得しません",
    "GitHub Pagesでホスティングされています",
    "GitHubはセキュリティ目的でIPアドレス等を処理する可能性があります",
  ],
  "terms/index.html": [
    "復元すると端末内の現在データが上書きされます",
    "OSまたはアプリの更新により、表示や仕様が変わる場合があります",
    "データ消失を完全に防ぐことはできません",
    "排除または制限できない責任まで否定するものではありません",
    "制定日: 2026-07-15",
    "最終改定日: 2026-07-15",
  ],
})) {
  const contents = readFileSync(join(root, page), "utf8").replace(/\s+/g, " ");
  for (const text of requiredText)
    if (!contents.includes(text))
      violations.push(`${page} misses required text: ${text}`);
}
if (violations.length) {
  console.error(
    "Static-site check failed:\n" +
      violations.map((item) => `- ${item}`).join("\n"),
  );
  process.exit(1);
}
console.log(
  "Static-site, accessibility baseline, and placeholder checks passed.",
);
