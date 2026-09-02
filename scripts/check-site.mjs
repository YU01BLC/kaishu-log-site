import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const required = [
  "index.html",
  "privacy/index.html",
  "privacy/en/index.html",
  "privacy/zh-hans/index.html",
  "privacy/zh-hant/index.html",
  "privacy/ko/index.html",
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
  { file: "index.html", lang: "ja" },
  { file: "privacy/index.html", lang: "ja" },
  { file: "privacy/en/index.html", lang: "en" },
  { file: "privacy/zh-hans/index.html", lang: "zh-Hans" },
  { file: "privacy/zh-hant/index.html", lang: "zh-Hant" },
  { file: "privacy/ko/index.html", lang: "ko" },
  { file: "support/index.html", lang: "ja" },
  { file: "terms/index.html", lang: "ja" },
  { file: "404.html", lang: "ja" },
];
const violations = [];
const siteUrl = "https://yu01blc.github.io/kaishu-log-site/";
const publicPages = {
  [siteUrl]: "index.html",
  [`${siteUrl}privacy/`]: "privacy/index.html",
  [`${siteUrl}privacy/en/`]: "privacy/en/index.html",
  [`${siteUrl}privacy/zh-hans/`]: "privacy/zh-hans/index.html",
  [`${siteUrl}privacy/zh-hant/`]: "privacy/zh-hant/index.html",
  [`${siteUrl}privacy/ko/`]: "privacy/ko/index.html",
  [`${siteUrl}support/`]: "support/index.html",
  [`${siteUrl}terms/`]: "terms/index.html",
};
const privacyPages = [
  {
    file: "privacy/index.html",
    lang: "ja",
    url: `${siteUrl}privacy/`,
    requiredText: [
      "現在のアプリプロセスのセッション中だけメモリ上に保持",
      "アプリのプロセスを完全に終了すると再びロック",
      "Homeと、Rewarded広告の報酬獲得後に解除されたAnalysis",
      "Recordの新規保存または更新が正常に完了した後",
      "明示的に「広告を見る」",
      "報酬獲得が確認された場合に限り",
      "通信状態、同意状態、広告在庫",
      "非パーソナライズ広告のみ",
      "今回のproduction releaseはiOS / App Store版のみ",
      "施行日: 2026-07-15",
      "最終更新日: 2026-09-02",
    ],
  },
  {
    file: "privacy/en/index.html",
    lang: "en",
    url: `${siteUrl}privacy/en/`,
    requiredText: [
      "current app process session",
      "fully terminating the app process locks Analysis again",
      "Banner ads may appear on Home and on Analysis after it has been unlocked",
      "after a new entry or an update is saved successfully",
      "explicitly choose “Watch Ad”",
      "Only an earned reward unlocks Analysis",
      "network connectivity, consent status, ad inventory",
      "non-personalized ads only",
      "This production release is for iOS / the App Store only",
      "Effective: 2026-07-15",
      "Last updated: 2026-09-02",
    ],
  },
  {
    file: "privacy/zh-hans/index.html",
    lang: "zh-Hans",
    url: `${siteUrl}privacy/zh-hans/`,
    requiredText: [
      "当前应用进程会话期间",
      "完全结束应用进程后，分析将再次锁定",
      "首页以及通过激励广告获得奖励后解锁的分析页面",
      "新建记录或更新记录成功保存后",
      "明确选择“观看广告”",
      "仅在确认获得奖励时",
      "网络连接、同意状态、广告库存",
      "仅请求非个性化广告",
      "本次生产发布仅面向iOS / App Store版本",
      "生效日期：2026-07-15",
      "最后更新：2026-09-02",
    ],
  },
  {
    file: "privacy/zh-hant/index.html",
    lang: "zh-Hant",
    url: `${siteUrl}privacy/zh-hant/`,
    requiredText: [
      "目前App處理程序工作階段期間",
      "完全結束App處理程序後，分析將再次鎖定",
      "首頁以及透過獎勵廣告取得獎勵後解鎖的分析頁面",
      "新增記錄或更新記錄成功儲存後",
      "明確選擇「觀看廣告」",
      "僅在確認取得獎勵時",
      "網路連線、同意狀態、廣告庫存",
      "僅請求非個人化廣告",
      "本次production release僅適用於iOS / App Store版本",
      "生效日期：2026-07-15",
      "最後更新：2026-09-02",
    ],
  },
  {
    file: "privacy/ko/index.html",
    lang: "ko",
    url: `${siteUrl}privacy/ko/`,
    requiredText: [
      "현재 앱 프로세스 세션 동안",
      "앱 프로세스를 완전히 종료하면 분석이 다시 잠깁니다",
      "홈과 보상형 광고의 보상을 획득한 후 잠금 해제된 분석 화면",
      "새 기록 또는 기존 기록의 업데이트가 성공적으로 저장된 후",
      "명시적으로 ‘광고 보기’를 선택",
      "보상 획득이 확인된 경우에만",
      "네트워크 연결, 동의 상태, 광고 재고",
      "비개인 맞춤 광고만 요청",
      "이번 production release는 iOS / App Store 버전만 대상",
      "시행일: 2026-07-15",
      "최종 업데이트: 2026-09-02",
    ],
  },
];
const privacyUrls = privacyPages.map(({ url }) => url);
const requiredPrivacyLinks = [
  "https://policies.google.com/privacy",
  "https://policies.google.com/technologies/partner-sites",
  "https://policies.google.com/technologies/ads",
  "https://adssettings.google.com/",
  "https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement",
  `${siteUrl}support/`,
];
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
for (const { file: page, lang } of pages) {
  if (!existsSync(join(root, page))) continue;
  const contents = readFileSync(join(root, page), "utf8");
  for (const pattern of [
    new RegExp(`<html\\s+lang="${lang}"`, "i"),
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
    if (
      !href.startsWith("#") &&
      !href.startsWith("mailto:") &&
      !/^[a-z][a-z\d+.-]*:/i.test(href)
    ) {
      const relativePath = href.split(/[?#]/, 1)[0];
      const target = resolve(root, dirname(page), relativePath);
      if (
        target !== root &&
        !target.startsWith(`${root}${sep}`)
      )
        violations.push(`${page} links outside the site root: ${href}`);
      else {
        const resolvedTarget = relativePath.endsWith("/")
          ? join(target, "index.html")
          : target;
        if (!existsSync(resolvedTarget))
          violations.push(`${page} has a broken relative link: ${href}`);
      }
    }
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
  "https://yu01blc.github.io/kaishu-log-site/privacy/en/",
  "https://yu01blc.github.io/kaishu-log-site/privacy/zh-hans/",
  "https://yu01blc.github.io/kaishu-log-site/privacy/zh-hant/",
  "https://yu01blc.github.io/kaishu-log-site/privacy/ko/",
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
  if (!existsSync(join(root, page))) continue;
  const contents = readFileSync(join(root, page), "utf8");
  const mailtos = [...contents.matchAll(/href="(mailto:[^"]+)"/gi)].map(
    (match) => match[1].replaceAll("&amp;", "&"),
  );
  if (!mailtos.includes(supportMailto))
    violations.push(`${page} does not use the canonical support mailto`);
}
for (const { file } of privacyPages) {
  if (!existsSync(join(root, file))) continue;
  const contents = readFileSync(join(root, file), "utf8");
  if (!/href="mailto:kaishulog\.support@gmail\.com(?:\?|\")/i.test(contents))
    violations.push(`${file} does not link to the support email`);
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
    "iOS版ではATT要求を行わず、本アプリ側でIDFAを利用しません",
    "AndroidのAD_IDは今回のproduction releaseの対象外です",
    "GitHub Pagesでホスティングされています",
    "GitHubはセキュリティ目的でIPアドレス等を処理する可能性があります",
    "施行日: 2026-07-15",
    "最終更新日: 2026-09-02",
    "https://policies.google.com/technologies/ads",
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
for (const { file, lang, url, requiredText } of privacyPages) {
  if (!existsSync(join(root, file))) continue;
  const contents = readFileSync(join(root, file), "utf8").replace(/\s+/g, " ");
  if (!contents.includes(`rel="canonical" href="${url}"`))
    violations.push(`${file} does not use its locale-specific canonical URL`);
  if (!contents.includes('aria-current="page"'))
    violations.push(`${file} does not identify the current language`);
  for (const privacyUrl of privacyUrls)
    if (!contents.includes(`href="${privacyUrl}"`))
      violations.push(`${file} misses language link ${privacyUrl}`);
  for (const requiredLink of requiredPrivacyLinks)
    if (!contents.includes(`href="${requiredLink}"`))
      violations.push(`${file} misses required privacy link ${requiredLink}`);
  for (const alternate of [...privacyPages, { lang: "x-default", url: `${siteUrl}privacy/` }]) {
    const pattern = new RegExp(
      `<link\\s+(?=[^>]*rel="alternate")(?=[^>]*hreflang="${alternate.lang}")(?=[^>]*href="${alternate.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")[^>]*>`,
      "i",
    );
    if (!pattern.test(contents))
      violations.push(`${file} misses hreflang ${alternate.lang}`);
  }
  for (const text of requiredText)
    if (!contents.includes(text))
      violations.push(`${file} misses production privacy text: ${text}`);
}
const stalePrivacyText = [
  "分析解放日",
  "当日1回",
  "Rewarded広告のみ",
  "記録導線には広告なし",
  "アプリ起動時や分析タブを開いただけでは自動表示しません",
];
const sensitivePatterns = [
  /ca-app-pub-\d/i,
  /\bpub-\d{8,}\b/i,
  /\bADMOB_[A-Z0-9_]+\b/,
  /\bEAS_[A-Z0-9_]+\b/,
  /requestNonPersonalizedAdsOnly/,
];
for (const { file } of pages) {
  if (!existsSync(join(root, file))) continue;
  const contents = readFileSync(join(root, file), "utf8");
  for (const text of stalePrivacyText)
    if (contents.includes(text))
      violations.push(`${file} contains stale privacy text: ${text}`);
  for (const pattern of sensitivePatterns)
    if (pattern.test(contents))
      violations.push(`${file} exposes sensitive or internal configuration: ${pattern}`);
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
