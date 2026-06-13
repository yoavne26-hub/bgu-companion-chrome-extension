import test from "node:test";
import assert from "node:assert/strict";
import { chatWithJima } from "./openaiClient.js";

function mockClient(captured, reply) {
  return {
    chat: {
      completions: {
        create: async (params) => {
          captured.params = params;
          return { choices: [{ message: reply }] };
        }
      }
    }
  };
}

test("sends system prompt, tools, and history; returns the raw assistant message", async () => {
  const captured = {};
  const reply = { role: "assistant", content: "Hi!", tool_calls: undefined };
  const client = mockClient(captured, reply);

  const message = await chatWithJima(
    { messages: [{ role: "user", content: "hello" }] },
    { client }
  );

  assert.equal(captured.params.messages[0].role, "system");
  assert.match(captured.params.messages[0].content, /BGU Companion student assistant/);
  assert.equal(captured.params.messages[1].role, "user");
  assert.equal(captured.params.messages[1].content, "hello");
  assert.ok(Array.isArray(captured.params.tools) && captured.params.tools.length === 8);
  assert.equal(captured.params.tool_choice, "auto");
  assert.deepEqual(message, reply);
});

test("attaches an optional page snapshot as a system note before the call", async () => {
  const captured = {};
  const client = mockClient(captured, { role: "assistant", content: "ok" });
  await chatWithJima(
    { messages: [{ role: "user", content: "what's here?" }], pageSnapshot: "TITLE: Course X" },
    { client }
  );
  const systemNotes = captured.params.messages.filter((m) => m.role === "system");
  assert.equal(systemNotes.length, 2);
  assert.match(systemNotes[1].content, /TITLE: Course X/);
});
