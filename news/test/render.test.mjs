import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml, renderArchive, renderFeed, renderHome, renderIssue } from "../worker/render.mjs";

test("기술 글의 코드와 강조는 렌더링하고 HTML은 실행하지 않는다", () => {
  const html = markdownToHtml("## 경계\n\n**검증**과 `userId`\n\n```js\n<script>alert(1)</script>\n## 코드 안의 제목\n```", { headingIds: true });
  assert.match(html, /<h2 id="section-1">경계<\/h2>/);
  assert.match(html, /<strong>검증<\/strong>/);
  assert.match(html, /<code>userId<\/code>/);
  assert.match(html, /<pre><code>&lt;script&gt;/);
  assert.doesNotMatch(html, /id="section-2"|<script>/);
});

test("동적 페이지는 외부 제목과 요약을 HTML escape한다", () => {
  const html = renderHome(
    [{
      slug: "2026-08-24-news",
      title: "<script>alert(1)</script>",
      summary: '"요약" & 설명',
      published_at: "2026-08-24T00:00:00.000Z",
      entry_count: 1,
      source_count: 1,
    }],
    {},
    "https://example.com"
  );
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.match(html, /&quot;요약&quot; &amp; 설명/);
});

test("제한된 Markdown만 안전한 HTML로 바꾼다", () => {
  const html = markdownToHtml("## 제목\n\n- [기사](https://example.com/a)\n- <img src=x onerror=alert(1)>");
  assert.match(html, /<h2>제목<\/h2>/);
  assert.match(html, /<a href="https:\/\/example\.com\/a"/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("이슈 페이지와 RSS가 D1 행을 렌더링한다", () => {
  const issue = {
    slug: "2026-08-24-news",
    title: "뉴스",
    summary: "요약",
    body_markdown: "## 본문\n\n내용",
    ai_generated: 1,
    entry_count: 1,
    source_count: 1,
    published_at: "2026-08-24T00:00:00.000Z",
    sources: [{ source: "소스", kind: "분류", entries: [{ title: "기사", url: "https://example.com", at: "2026-08-24T00:00:00.000Z" }] }],
  };
  const html = renderIssue(issue, {}, "https://news.example.com");
  const rss = renderFeed([issue], "https://news.example.com");
  assert.match(html, /AI 생성/);
  assert.match(html, /오늘 읽은 소식/);
  assert.match(rss, /<rss version="2\.0">/);
  assert.match(rss, /https:\/\/news\.example\.com\/issues\/2026-08-24-news\//);
});

test("아카이브는 벤더 아이콘과 선택 필터를 렌더링한다", () => {
  const html = renderArchive([
    { vendor: "IBM", title: "IBM 가이드", url: "https://example.com/ibm", document_date: "2026-08-24", kind: "기술 문서", ref: "IBM-1" },
    { vendor: "Dell", title: "Dell 가이드", url: "https://example.com/dell", document_date: "2026-08-23", kind: "스펙 시트", ref: "DELL-1" },
  ], {}, "https://example.com");
  assert.match(html, /class="archive-chip" data-vendor="IBM"/);
  assert.match(html, /class="archive-chip" data-vendor="Dell"/);
  assert.match(html, /data-vendor="IBM"/);
  assert.match(html, /row\.dataset\.vendor===vendor/);
  // 아직 문서가 없는 벤더도 버튼을 보여 주고 0건으로 표시한다.
  assert.match(html, /data-vendor="NetApp" aria-pressed="false">.*?<strong>0<\/strong>/);
  assert.match(html, /data-vendor="Oracle" aria-pressed="false">.*?<strong>0<\/strong>/);
  assert.match(html, /id="archive-empty" hidden/);
});

test("뉴스 본문의 [n] 출처 번호는 번호 붙은 출처 목록으로 이어지고, 나머지 소식은 접어 둔다", async () => {
  const { renderIssue } = await import("../worker/render.mjs");
  const entry = (title, url) => ({ title, url, at: "2026-09-27T01:00:00Z" });
  const html = renderIssue({
    title: "t", summary: "s", published_at: "2026-09-27T22:00:00Z", entry_count: 3, source_count: 2, ai_generated: 1,
    body_markdown: "## 흐름\n\n문장이다.[[2]](https://b.example/2)",
    sources: [{ source: "A", kind: "k", entries: [entry("하나", "https://a.example/1"), entry("둘", "https://b.example/2")] }, { source: "B", kind: "k", entries: [entry("셋", "https://c.example/3")] }],
  }, {}, "https://news.example");
  assert.match(html, /문장이다\.<sup class="cite"><a href="#source-2">\[2\]<\/a><\/sup>/);
  assert.match(html, /<h2>출처<\/h2><ol class="links cited"><li id="source-2" value="2"><a href="https:\/\/b\.example\/2"/);
  assert.match(html, /<summary>함께 모은 소식 2건 펼쳐 보기<\/summary>/);
});

test("내비게이션은 아카이브·뉴스레터만 잇고 개발 일지 링크는 없다", () => {
  const html = renderHome([], { ARCHIVE_URL: "https://specsheet.example/archive/" }, "https://specsheet.example");
  assert.doesNotMatch(html, /개발 일지/);
  assert.match(html, /<a href="https:\/\/specsheet\.example\/archive\/">아카이브<\/a>/);
  assert.match(html, /<a href="\/" aria-current="page">뉴스레터<\/a>/);
  const away = renderHome([], { NEWS_URL: "https://specsheet.example/" }, "https://elsewhere.example");
  assert.match(away, /<a href="https:\/\/specsheet\.example\/" aria-current="page">뉴스레터<\/a>/);
  assert.match(away, /href="https:\/\/specsheet\.example\/feed\.xml"/);
});

test("RSS guid는 Worker를 옮겨도 그대로라 구독자에게 옛 이슈가 다시 오지 않는다", () => {
  const issue = { slug: "2026-10-01-news", title: "뉴스", summary: "요약", published_at: "2026-10-01T00:00:00.000Z" };
  const rss = renderFeed([issue], "https://specsheet.tkddls8848.workers.dev");
  assert.match(rss, /<guid isPermaLink="false">https:\/\/devlog\.tkddls8848\.workers\.dev\/issues\/2026-10-01-news\/<\/guid>/);
  assert.match(rss, /<link>https:\/\/specsheet\.tkddls8848\.workers\.dev\/issues\/2026-10-01-news\/<\/link>/);
});
