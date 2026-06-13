const test = require("node:test");
const assert = require("node:assert/strict");

function makeChromeStub() {
  const store = {};
  return {
    storage: {
      local: {
        get: async (key) => (typeof key === "string" ? { [key]: store[key] } : { ...store }),
        set: async (obj) => { Object.assign(store, obj); },
        remove: async (key) => { delete store[key]; }
      }
    }
  };
}

test("save_task / list_tasks / update_task work against the real JimaTasks export", async () => {
  globalThis.chrome = makeChromeStub();
  delete require.cache[require.resolve("../src/shared/jima-tasks.js")];
  delete require.cache[require.resolve("../src/shared/jima-tools.js")];
  require("../src/shared/jima-tasks.js");
  require("../src/shared/jima-tools.js");
  const tools = globalThis.JimaTools.create();

  const saveRes = await tools.save_task({
    title: "HW1", evidence: "Submit by Tuesday", confidence: "high",
    dueDate: "2026-07-01", sourceUrl: "https://moodle.bgu.ac.il/course/1"
  });
  assert.equal(saveRes.saved, true);
  assert.equal(saveRes.task.title, "HW1");
  assert.equal(saveRes.task.dueDateRaw, "2026-07-01");

  const listRes = await tools.list_tasks({ status: "all" });
  assert.equal(listRes.tasks.length, 1);
  const id = listRes.tasks[0].id;

  const doneRes = await tools.update_task({ taskId: id, action: "done" });
  assert.equal(doneRes.updated, true);
  assert.equal((await tools.list_tasks({ status: "done" })).tasks.length, 1);

  const delRes = await tools.update_task({ taskId: id, action: "delete" });
  assert.equal(delRes.updated, true);
  assert.equal((await tools.list_tasks({ status: "all" })).tasks.length, 0);
});
