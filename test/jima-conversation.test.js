const test = require("node:test");
const assert = require("node:assert/strict");
const { threadStorageKey, trimThread } = require("../src/shared/jima-conversation.js");

test("threadStorageKey is namespaced per tab", () => {
  assert.equal(threadStorageKey(42), "jima_thread_42");
});

test("trimThread keeps the most recent messages under the cap", () => {
  const msgs = Array.from({ length: 50 }, (_, i) => ({ role: "user", content: String(i) }));
  const trimmed = trimThread(msgs, 40);
  assert.equal(trimmed.length, 40);
  assert.equal(trimmed[0].content, "10");
  assert.equal(trimmed.at(-1).content, "49");
});

test("trimThread returns the array unchanged when under the cap", () => {
  const msgs = [{ role: "user", content: "a" }];
  assert.deepEqual(trimThread(msgs, 40), msgs);
});

test("trimThread does not start the slice on an orphaned tool message", () => {
  const msgs = Array.from({ length: 41 }, (_, i) => ({ role: "user", content: String(i) }));
  msgs[1] = { role: "tool", tool_call_id: "x", content: "{}" };
  const trimmed = trimThread(msgs, 40);
  assert.notEqual(trimmed[0].role, "tool");
});
