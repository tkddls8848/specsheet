const DAY = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});
const CLOCK = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inlineMarkdown = (value) => {
  const raw = String(value || "");
  const pattern = /\[\[(\d{1,3})\]\]\((https?:\/\/[^)\s]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let output = "";
  let offset = 0;
  for (const match of raw.matchAll(pattern)) {
    output += escapeHtml(raw.slice(offset, match.index));
    // [[3]](url) is a numbered source reference in the news digest.
    if (match[1] !== undefined) output += `<sup class="cite"><a href="#source-${match[1]}">[${match[1]}]</a></sup>`;
    else if (match[3] !== undefined) output += `<code>${escapeHtml(match[3])}</code>`;
    else if (match[4] !== undefined) output += `<strong>${escapeHtml(match[4])}</strong>`;
    else output += `<a href="${escapeHtml(match[6])}" rel="noopener">${escapeHtml(match[5])}</a>`;
    offset = match.index + match[0].length;
  }
  return output + escapeHtml(raw.slice(offset));
};

export function markdownToHtml(markdown, { headingIds = false } = {}) {
  const output = [];
  let paragraph = [];
  let list = [];
  let quote = [];
  let code = null;
  let fence = "";
  let headingIndex = 0;
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) output.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  const flushQuote = () => {
    if (quote.length) output.push(`<blockquote>${quote.join("\n").split(/\n{2,}/).map((part) => `<p>${inlineMarkdown(part.replace(/\n/g, " "))}</p>`).join("")}</blockquote>`);
    quote = [];
  };
  const flushAll = () => { flushParagraph(); flushList(); flushQuote(); };

  for (const line of String(markdown || "").split(/\r?\n/)) {
    // A fence closes only on a run at least as long as the one that opened it,
    // so a ```` block can quote ``` inside (diff excerpts in journal references).
    const marks = line.match(/^(`{3,})/)?.[1];
    if (code !== null) {
      if (marks && marks.length >= fence.length && !line.slice(marks.length).trim()) { output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`); code = null; }
      else code.push(line);
      continue;
    }
    if (marks) { flushAll(); code = []; fence = marks; continue; }
    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    const item = line.match(/^\s*-\s+(.+)$/);
    const quoted = line.match(/^>\s?(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      // Only h2/h3 feed the table of contents.
      output.push(`<h${level}${headingIds && level <= 3 ? ` id="section-${++headingIndex}"` : ""}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
    } else if (item) {
      flushParagraph();
      flushQuote();
      list.push(item[1]);
    } else if (!line.trim()) {
      flushAll();
    } else {
      flushList();
      flushQuote();
      paragraph.push(line.trim());
    }
  }
  flushAll();
  if (code !== null) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("\n");
}

const themeToggle = `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="라이트/다크 모드 전환">
  <svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
  <svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
</button>`;

const siteFromEnv = (env) => ({
  title: "devlog news",
  tagline: "IT 업계 뉴스와 엔지니어링 블로그를 하루 한 편으로 묶는 뉴스레터",
  githubUser: "tkddls8848",
  devlogUrl: env.DEVLOG_URL || "https://tkddls8848.github.io/devlog/",
  archiveUrl: env.ARCHIVE_URL || "https://tkddls8848.github.io/devlog/archive/",
});

export function layout({ env, title, summary, current = "", content, canonical = "", wide = false, scripts = [], robots = "" }) {
  const site = siteFromEnv(env);
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title ? `${escapeHtml(title)} · ` : ""}${site.title}</title>
    <meta name="description" content="${escapeHtml(summary || site.tagline)}" />
    <meta name="color-scheme" content="light dark" />
    ${robots ? `<meta name="robots" content="${escapeHtml(robots)}" />` : ""}
    ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : ""}
    <link rel="alternate" type="application/rss+xml" title="${site.title}" href="/feed.xml" />
    <link rel="stylesheet" href="/assets/css/theme.css" />
    <link rel="stylesheet" href="/assets/css/main.css" />
    <script src="/assets/js/theme-init.js"></script>
  </head>
  <body${wide ? ' class="wide"' : ""}>
    <header class="site-header">
      <div class="site-header-inner">
        <a class="site-title" href="/"><span class="site-mark" aria-hidden="true"></span>${site.title}</a>
        <nav class="site-nav" aria-label="주요">
          <a href="${escapeHtml(site.devlogUrl)}"${current === "devlog" ? ' aria-current="page"' : ""}>개발 일지</a>
          <a href="${escapeHtml(site.archiveUrl)}"${current === "archive" ? ' aria-current="page"' : ""}>아카이브</a>
          <a href="/"${current === "home" ? ' aria-current="page"' : ""}>뉴스레터</a>
        </nav>
        ${themeToggle}
      </div>
    </header>
    <main id="main-content">${content}</main>
    <footer class="site-footer">
      <div class="site-footer-inner">
        <p class="site-tagline">${site.tagline}</p>
        <p>© ${new Date().getFullYear()} ${site.githubUser} · <a href="https://github.com/${site.githubUser}">GitHub</a> · <a href="/feed.xml">RSS</a></p>
      </div>
    </footer>
    <script src="/assets/js/theme-toggle.js"></script>
    ${scripts.map((src) => `<script src="${escapeHtml(src)}" defer></script>`).join("")}
  </body>
</html>`;
}

export function renderHome(issues, env, origin) {
  const rows = issues.length
    ? issues
        .map(
          (issue) => `<li>
      <time datetime="${escapeHtml(issue.published_at)}">${DAY.format(new Date(issue.published_at))}</time>
      <a href="/issues/${encodeURIComponent(issue.slug)}/">${escapeHtml(issue.title)}</a>
      ${issue.summary ? `<p>${escapeHtml(issue.summary)}</p>` : ""}
      <p class="meta">소식 ${Number(issue.entry_count)}건 · ${Number(issue.source_count)}곳</p>
    </li>`
        )
        .join("\n")
    : '<li class="empty">아직 발행된 뉴스레터가 없습니다.</li>';
  const content = `<p class="page-intro">IT 업계 뉴스와 엔지니어링 블로그에서 하루치 소식을 모아 한 편으로 묶은 뉴스레터입니다. 수집·생성·저장·서비스는 Cloudflare에서 실행됩니다.</p>
<ul class="post-list">${rows}</ul>`;
  return layout({ env, summary: "매일 발행되는 IT 뉴스 다이제스트", current: "home", content, canonical: `${origin}/` });
}

const sourceItem = (entry, number) =>
  `<li${number ? ` id="source-${number}" value="${number}"` : ""}><a href="${escapeHtml(entry.url)}" rel="noopener">${escapeHtml(entry.title)}</a><span class="meta">${number ? `${escapeHtml(entry.source)} · ` : ""}<time datetime="${escapeHtml(entry.at)}">${CLOCK.format(new Date(entry.at))}</time>${entry.note ? ` · ${escapeHtml(entry.note)}` : ""}</span></li>`;

function issueSources(issue) {
  const grouped = (groups) => groups
    .map(
      (group) => `<h3>${escapeHtml(group.source)}${group.kind ? ` <span class="meta">${escapeHtml(group.kind)}</span>` : ""}</h3>
      <ul class="links">${group.entries.map((entry) => sourceItem(entry)).join("")}</ul>`
    )
    .join("\n");
  // Numbers follow the stored entry order, the same order the prompt numbered them.
  const all = issue.sources.flatMap((group) => group.entries.map((entry) => ({ ...entry, source: group.source })));
  const cited = new Set([...String(issue.body_markdown || "").matchAll(/\[\[(\d+)\]\]\(/g)].map((m) => Number(m[1])));
  if (!cited.size) return `<section class="sources"><h2>오늘 읽은 소식</h2>${grouped(issue.sources)}</section>`;
  const used = all.map((entry, index) => [entry, index + 1]).filter(([, number]) => cited.has(number));
  const rest = issue.sources
    .map((group) => ({ ...group, entries: group.entries.filter((entry) => !used.some(([cite]) => cite.url === entry.url)) }))
    .filter((group) => group.entries.length);
  const others = rest.reduce((sum, group) => sum + group.entries.length, 0);
  return `<section class="sources" id="sources"><h2>출처</h2><ol class="links cited">${used.map(([entry, number]) => sourceItem(entry, number)).join("")}</ol>${others ? `<details><summary>함께 모은 소식 ${others}건 펼쳐 보기</summary>${grouped(rest)}</details>` : ""}</section>`;
}

export function renderIssue(issue, env, origin) {
  const sources = issueSources(issue);
  const content = `<article class="post">
  <header class="post-header">
    <h1>${escapeHtml(issue.title)}</h1>
    <p class="post-meta"><time datetime="${escapeHtml(issue.published_at)}">${DAY.format(new Date(issue.published_at))}</time><span>소식 ${Number(issue.entry_count)}건 · 출처 ${Number(issue.source_count)}곳</span>${issue.ai_generated ? '<span class="badge">AI 생성</span>' : ""}</p>
    ${issue.summary ? `<p class="post-summary">${escapeHtml(issue.summary)}</p>` : ""}
  </header>
  ${markdownToHtml(issue.body_markdown)}
  ${sources}
  <p class="back"><a href="/">← 뉴스레터</a></p>
</article>`;
  return layout({
    env,
    title: issue.title,
    summary: issue.summary,
    content,
    canonical: `${origin}/issues/${encodeURIComponent(issue.slug)}/`,
  });
}

export function renderArchive(records, env, origin) {
  const vendors = ["IBM", "Lenovo", "HPE", "Dell", "NetApp", "Oracle"];
  const counts = Object.fromEntries(vendors.map((vendor) => [vendor, records.filter((record) => record.vendor === vendor).length]));
  // Every collected vendor keeps its chip, even before its first document lands.
  const vendorButtons = vendors.map((vendor) => `<button type="button" class="archive-chip" data-vendor="${escapeHtml(vendor)}" aria-pressed="false"><span class="vendor-icon vendor-icon-${vendor.toLowerCase()}" aria-hidden="true">${escapeHtml(vendor)}</span><span>${escapeHtml(vendor)}</span><strong>${counts[vendor]}</strong></button>`).join("");
  const rows = records.map((record) => `<tr data-vendor="${escapeHtml(record.vendor)}">
    <td class="col-date"><time datetime="${escapeHtml(record.document_date)}">${escapeHtml(record.document_date)}</time></td>
    <td class="col-vendor"><span class="vendor-icon vendor-icon-${escapeHtml(record.vendor.toLowerCase())}" role="img" aria-label="${escapeHtml(record.vendor)}">${escapeHtml(record.vendor)}</span></td>
    <td class="col-doc"><a href="${escapeHtml(record.url)}" rel="noopener">${escapeHtml(record.title)}</a>
      <span class="meta">${escapeHtml(record.kind)}${record.tag ? ` · ${escapeHtml(record.tag)}` : ""}${record.ref ? ` · <code>${escapeHtml(record.ref)}</code>` : ""}</span>
      ${record.note ? `<p class="archive-note">${escapeHtml(record.note)}</p>` : ""}</td>
  </tr>`).join("");
  const content = `<p class="page-intro">IBM · Lenovo · HPE · Dell · NetApp · Oracle 제품 문서에서 관측한 갱신입니다. Cloudflare Cron이 매일 09:25 KST에 수집하고 D1에 저장합니다.</p>
  <div class="archive-filters"><input type="search" id="archive-query" placeholder="제목 · 문서번호 검색" aria-label="문서 검색" /><div class="archive-chips" role="group" aria-label="벤더 선택"><button type="button" class="archive-chip is-on" data-vendor="" aria-pressed="true"><span class="vendor-icon vendor-icon-all" aria-hidden="true">ALL</span><span>전체</span><strong>${records.length}</strong></button>${vendorButtons}</div></div>
  <p class="archive-count" id="archive-count">${records.length}건</p>
  <div class="archive-table-wrap"><table class="archive-table"><thead><tr><th class="col-date">날짜</th><th class="col-vendor">벤더</th><th class="col-doc">문서</th></tr></thead><tbody id="archive-rows">${rows || '<tr><td colspan="3">아직 수집된 문서가 없습니다.</td></tr>'}</tbody></table></div>
  <p class="archive-empty" id="archive-empty" hidden>조건에 맞는 문서가 없습니다. 새로 추가한 벤더는 다음 수집(매일 09:25 KST)부터 채워집니다.</p>
  <script>(()=>{const q=document.getElementById('archive-query'),rows=[...document.querySelectorAll('#archive-rows tr[data-vendor]')],count=document.getElementById('archive-count'),empty=document.getElementById('archive-empty'),chips=[...document.querySelectorAll('.archive-chip')];let vendor='';const apply=()=>{const term=q.value.trim().toLowerCase();let n=0;for(const row of rows){const show=(!vendor||row.dataset.vendor===vendor)&&(!term||row.textContent.toLowerCase().includes(term));row.hidden=!show;if(show)n++}count.textContent=n+'건';if(empty)empty.hidden=n!==0||!rows.length};q?.addEventListener('input',apply);for(const chip of chips)chip.addEventListener('click',()=>{vendor=chip.dataset.vendor;for(const item of chips){const active=item===chip;item.classList.toggle('is-on',active);item.setAttribute('aria-pressed',String(active))}apply()});apply()})()</script>`;
  return layout({ env, title: "벤더 문서 아카이브", summary: "IBM, Lenovo, HPE, Dell, NetApp, Oracle 제품 문서 아카이브", current: "archive", content, canonical: `${origin}/archive/`, wide: true });
}
export function renderNotFound(env) {
  return layout({
    env,
    title: "찾을 수 없는 주소",
    content: '<p class="page-intro">이 주소에 해당하는 뉴스레터가 없습니다. <a href="/">발행된 이슈 목록</a>에서 찾아보세요.</p>',
  });
}

const escapeXml = escapeHtml;

export function renderFeed(issues, origin) {
  const items = issues
    .map(
      (issue) => `<item><title>${escapeXml(issue.title)}</title><link>${origin}/issues/${encodeURIComponent(issue.slug)}/</link><guid isPermaLink="true">${origin}/issues/${encodeURIComponent(issue.slug)}/</guid><pubDate>${new Date(issue.published_at).toUTCString()}</pubDate><description>${escapeXml(issue.summary)}</description></item>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>devlog news</title><link>${origin}/</link><description>매일 발행되는 IT 뉴스 다이제스트</description><language>ko</language>${items}</channel></rss>`;
}
