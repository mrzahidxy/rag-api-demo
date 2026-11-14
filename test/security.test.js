const assert = require("node:assert/strict");
const test = require("node:test");
const { rateLimit, requireKey } = require("../dist/security");

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("query key rejects a different key", () => {
  const auth = requireKey("a".repeat(32));
  const res = response();
  let allowed = false;
  auth({ get: () => "b".repeat(32) }, res, () => { allowed = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(allowed, false);
});

test("rate limit returns 429 and Retry-After after its budget", () => {
  const limit = rateLimit(2);
  let allowed = 0;
  for (let i = 0; i < 3; i += 1) {
    const res = response();
    limit({}, res, () => { allowed += 1; });
    if (i === 2) {
      assert.equal(res.statusCode, 429);
      assert.ok(res.headers["Retry-After"] >= 1);
    }
  }
  assert.equal(allowed, 2);
});
