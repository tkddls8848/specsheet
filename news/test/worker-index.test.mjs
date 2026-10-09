import assert from "node:assert/strict";
import test from "node:test";
import worker, { ARCHIVE_CRON, DIGEST_CRON } from "../worker/index.mjs";

// D1 stub: 모든 조회가 빈 결과. legacy 이관은 이미 끝난 것으로 둔다.
const fakeDb = () => {
  const statement = {
    bind() { return statement; },
    async first() { return { value: "done" }; },
    async all() { return { results: [] }; },
    async run() { return { meta: { changes: 0 } }; },
  };
  return { prepare: () => statement, batch: async () => [] };
};
const env = () => ({
  DB: fakeDb(),
  ASSETS: { fetch: async () => new Response("missing", { status: 404 }) },
});
const get = (path, init) => worker.fetch(new Request(`https://specsheet.tkddls8848.workers.dev${path}`, init), env());

test("뉴스·아카이브·RSS·healthz는 200으로 응답한다", async () => {
  for (const path of ["/", "/archive/", "/archive", "/feed.xml", "/healthz"]) {
    assert.equal((await get(path)).status, 200, path);
  }
  const health = await (await get("/healthz")).json();
  assert.deepEqual(Object.keys(health).sort(), ["latestArchiveRun", "latestRun", "ok"]);
});

test("작업 회고 경로는 옮겨 오지 않았으므로 404이고, POST는 405다", async () => {
  assert.equal((await get("/devlog/")).status, 404);
  assert.equal((await get("/devlog/posts/2026-10-01-devlog/")).status, 404);
  assert.equal((await get("/devlog/admin/login", { method: "POST", body: "x" })).status, 405);
});

test("Cron은 뉴스·아카이브만 돌리고 모르는 Cron은 건너뛴다", async () => {
  const ran = [];
  const ctx = { waitUntil: (promise) => ran.push(promise) };
  await worker.scheduled({ cron: "10 0 * * *", scheduledTime: Date.now() }, env(), ctx);
  assert.equal(ran.length, 0);
  assert.equal(DIGEST_CRON, "0 22 * * *");
  assert.equal(ARCHIVE_CRON, "25 0 * * *");
});
