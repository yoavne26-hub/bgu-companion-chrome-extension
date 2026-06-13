const test = require("node:test");
const assert = require("node:assert/strict");
const { runJimaAgentLoop } = require("../src/shared/jima-agent-loop.js");

function assistant(content, toolCalls) {
  const msg = { role: "assistant", content: content || "" };
  if (toolCalls) msg.tool_calls = toolCalls;
  return msg;
}
function toolCall(id, name, args) {
  return { id, type: "function", function: { name, arguments: JSON.stringify(args) } };
}

test("returns the final answer when no tools are called", async () => {
  const texts = [];
  const thread = [{ role: "user", content: "hi" }];
  const result = await runJimaAgentLoop({
    thread,
    sendTurn: async () => assistant("Hello there!"),
    executeTool: async () => { throw new Error("should not run"); },
    onAssistantText: (t) => texts.push(t)
  });
  assert.equal(result.stopped, false);
  assert.deepEqual(texts, ["Hello there!"]);
  assert.equal(thread.at(-1).role, "assistant");
});

test("executes a tool call, appends its result, then finishes", async () => {
  const calls = [];
  const texts = [];
  const thread = [{ role: "user", content: "what files?" }];
  let turn = 0;
  const result = await runJimaAgentLoop({
    thread,
    sendTurn: async () => {
      turn += 1;
      return turn === 1
        ? assistant("", [toolCall("c1", "list_files", {})])
        : assistant("You have 2 files.");
    },
    executeTool: async (name, args) => { calls.push([name, args]); return { files: ["a", "b"] }; },
    onAssistantText: (t) => texts.push(t)
  });
  assert.deepEqual(calls, [["list_files", {}]]);
  const toolMsg = thread.find((m) => m.role === "tool");
  assert.equal(toolMsg.tool_call_id, "c1");
  assert.match(toolMsg.content, /files/);
  assert.deepEqual(texts, ["You have 2 files."]);
  assert.equal(result.stopped, false);
});

test("a throwing tool is reported back to the model as an error result", async () => {
  const thread = [{ role: "user", content: "go" }];
  let turn = 0;
  await runJimaAgentLoop({
    thread,
    sendTurn: async () => (++turn === 1 ? assistant("", [toolCall("c1", "read_page", {})]) : assistant("done")),
    executeTool: async () => { throw new Error("tab gone"); },
    onAssistantText: () => {}
  });
  const toolMsg = thread.find((m) => m.role === "tool");
  assert.match(toolMsg.content, /tab gone/);
});

test("stops at the round cap and emits a stop message", async () => {
  const texts = [];
  const thread = [{ role: "user", content: "loop" }];
  const result = await runJimaAgentLoop({
    thread,
    maxRounds: 3,
    sendTurn: async () => assistant("", [toolCall("c", "read_page", {})]),
    executeTool: async () => ({ ok: true }),
    onAssistantText: (t) => texts.push(t)
  });
  assert.equal(result.stopped, true);
  assert.equal(texts.length, 1);
  assert.match(texts[0], /stopped/i);
});

test("renders narration text AND executes the tool when both are present", async () => {
  const texts = [];
  const calls = [];
  const thread = [{ role: "user", content: "look it up" }];
  let turn = 0;
  await runJimaAgentLoop({
    thread,
    sendTurn: async () => (++turn === 1
      ? assistant("Let me check the page.", [toolCall("c1", "read_page", {})])
      : assistant("Here's what I found.")),
    executeTool: async (n) => { calls.push(n); return { ok: true }; },
    onAssistantText: (t) => texts.push(t)
  });
  assert.deepEqual(calls, ["read_page"]);
  assert.deepEqual(texts, ["Let me check the page.", "Here's what I found."]);
});
