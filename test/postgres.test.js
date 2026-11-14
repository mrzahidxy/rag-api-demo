const assert = require("node:assert/strict");
const test = require("node:test");

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/test";
const db = require("../dist/db");
const { postgresStore } = require("../dist/providers/postgres");

test("replacing a document keeps its ID and refreshes chunks in one transaction", async () => {
  const calls = [];
  const originalConnect = db.pool.connect;
  db.pool.connect = async () => ({
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT id FROM documents")) return { rows: [{ id: 42 }] };
      return { rows: [] };
    },
    release() {}
  });

  try {
    const id = await postgresStore.add("source-1", "Updated", "New text", [
      { content: "New text", embedding: [0.1, 0.2] }
    ]);
    assert.equal(id, 42);
    assert.equal(calls[0].sql, "BEGIN");
    assert.ok(calls.some(({ sql, params }) => sql.startsWith("UPDATE documents") && params[2] === 42));
    assert.ok(calls.some(({ sql, params }) => sql.startsWith("DELETE FROM chunks") && params[0] === 42));
    assert.ok(calls.some(({ sql, params }) => sql.startsWith("INSERT INTO chunks") && params[0] === 42));
    assert.equal(calls.at(-1).sql, "COMMIT");
    assert.ok(!calls.some(({ sql }) => sql.startsWith("DELETE FROM documents")));
  } finally {
    db.pool.connect = originalConnect;
    await db.pool.end();
  }
});
