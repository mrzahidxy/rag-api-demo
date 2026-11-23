const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeExternalId } = require("../dist/externalId");

test("missing and null external IDs create independent documents", () => {
  assert.equal(normalizeExternalId(undefined), null);
  assert.equal(normalizeExternalId(null), null);
});

test("only nonempty string external IDs can replace documents", () => {
  assert.equal(normalizeExternalId("  source-1  "), "source-1");
  for (const value of ["", " ", 1, true, {}, [], ["source-1"]]) {
    assert.equal(normalizeExternalId(value), undefined);
  }
});
