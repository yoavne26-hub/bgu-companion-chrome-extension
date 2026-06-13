import test from "node:test";
import assert from "node:assert/strict";
import { JIMA_TOOL_SCHEMAS, JIMA_TOOL_NAMES } from "./jimaTools.js";

test("exposes exactly the eight agent tools", () => {
  assert.deepEqual(
    [...JIMA_TOOL_NAMES].sort(),
    ["download_files", "inspect_assignment", "list_files", "list_saved_courses",
     "list_tasks", "read_page", "save_task", "update_task"].sort()
  );
});

test("every schema is a valid OpenAI function tool", () => {
  for (const tool of JIMA_TOOL_SCHEMAS) {
    assert.equal(tool.type, "function");
    assert.equal(typeof tool.function.name, "string");
    assert.ok(tool.function.description.length > 0, `${tool.function.name} needs a description`);
    assert.equal(tool.function.parameters.type, "object");
    assert.ok(tool.function.parameters.properties, `${tool.function.name} needs properties`);
  }
});

test("save_task requires evidence and confidence (honesty contract)", () => {
  const saveTask = JIMA_TOOL_SCHEMAS.find((t) => t.function.name === "save_task");
  assert.ok(saveTask.function.parameters.required.includes("evidence"));
  assert.ok(saveTask.function.parameters.required.includes("confidence"));
});
