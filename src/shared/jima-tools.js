// src/shared/jima-tools.js
// Client-side executors for the Jima agent tools. Names + argument shapes MUST
// match backend/jimaTools.js (the OpenAI-facing contract). Each executor returns
// a JSON-serializable result that becomes a tool message in the conversation.

function sendBackgroundMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "No response from background." });
      });
    } catch (error) {
      resolve({ ok: false, error: error?.message || "Background message failed." });
    }
  });
}

function compactPageResult(response) {
  const ctx = response.pageContext || {};
  const det = response.detections || {};
  return {
    pageTitle: ctx.pageTitle || ctx.documentTitle || "",
    url: ctx.currentUrl || ctx.url || "",
    headings: Array.isArray(ctx.headings) ? ctx.headings.slice(0, 20) : [],
    visibleTextPreview: String(ctx.visibleTextPreview || "").slice(0, 6000),
    fileLinks: Array.isArray(ctx.fileLinks) ? ctx.fileLinks.slice(0, 30) : [],
    homeworkCandidates: Array.isArray(det.homeworkCandidates) ? det.homeworkCandidates.slice(0, 20) : [],
    deadlineCandidates: Array.isArray(det.deadlineCandidates) ? det.deadlineCandidates.slice(0, 20) : [],
    fileCandidates: Array.isArray(det.fileCandidates) ? det.fileCandidates.slice(0, 30) : []
  };
}

// ctx.isUsingPage()  -> boolean (page access toggle)
// ctx.requestDownloadConfirm(files) -> renders confirm chip; returns nothing
// ctx.listSavedCourses() -> [{name,url}]
function createJimaTools(ctx = {}) {
  const isUsingPage = ctx.isUsingPage || (() => true);

  async function read_page() {
    if (!isUsingPage()) return { disabled: true, reason: "Page access is off. Turn on 'Using this page' to let Jima read the current tab." };
    const response = await sendBackgroundMessage({ type: "JIMA_ANALYZE_CURRENT_PAGE" });
    if (!response?.ok) return { error: response?.error || "Could not read the page." };
    return compactPageResult(response);
  }

  async function list_files() {
    const page = await read_page();
    if (page.disabled || page.error) return page;
    return { files: page.fileCandidates };
  }

  async function inspect_assignment(args = {}) {
    if (!isUsingPage()) return { disabled: true, reason: "Page access is off. Turn on 'Using this page' to let Jima inspect assignments." };
    const response = await sendBackgroundMessage({
      type: "JIMA_OPEN_AND_INSPECT_ASSIGNMENT",
      assignment: { url: args.url, title: args.title || "" }
    });
    if (!response?.ok) return { error: response?.error || "Could not inspect the assignment." };
    return { assignmentDetail: response.assignmentDetail || response.detail || response };
  }

  async function download_files(args = {}) {
    if (!isUsingPage()) return { disabled: true, reason: "Page access is off. Turn on 'Using this page' to let Jima prepare downloads." };
    const files = Array.isArray(args.files) ? args.files : [];
    if (files.length === 0) return { error: "No files were provided to download." };
    if (typeof ctx.requestDownloadConfirm !== "function") {
      return { error: "Download confirmation UI is unavailable." };
    }
    ctx.requestDownloadConfirm(files);
    return {
      status: "awaiting_user_confirmation",
      message: `Proposed ${files.length} file(s) for download. The student must click the confirm button; nothing has downloaded yet.`,
      files: files.map((f) => ({ name: f.name, url: f.url }))
    };
  }

  async function save_task(args = {}) {
    if (!globalThis.JimaTasks?.saveJimaTask) return { error: "Task storage is unavailable." };
    if (!args.title) return { error: "A task title is required." };
    const result = await globalThis.JimaTasks.saveJimaTask({
      title: args.title,
      type: "possible task",
      dueDateRaw: args.dueDate || "",
      evidence: args.evidence || "",
      confidence: args.confidence || "low",
      sourceUrl: args.sourceUrl || "",
      candidateUrl: args.sourceUrl || ""
    });
    if (result?.duplicate) {
      return { saved: false, duplicate: true, message: "A matching task is already saved.", task: result.task };
    }
    return { saved: true, task: result?.task };
  }

  async function list_tasks(args = {}) {
    if (!globalThis.JimaTasks?.getJimaSavedTasks) return { error: "Task storage is unavailable." };
    const tasks = (await globalThis.JimaTasks.getJimaSavedTasks()) || [];
    const status = args.status || "all";
    const filtered = status === "all" ? tasks : tasks.filter((t) => (t.status || "open") === status);
    return { tasks: filtered };
  }

  async function update_task(args = {}) {
    if (!globalThis.JimaTasks) return { error: "Task storage is unavailable." };
    if (!args.taskId) return { error: "A taskId is required." };
    if (args.action === "delete") {
      await globalThis.JimaTasks.deleteJimaTask(args.taskId);
      return { updated: true, action: "delete" };
    }
    await globalThis.JimaTasks.updateJimaTaskStatus(args.taskId, "done");
    return { updated: true, action: "done" };
  }

  async function list_saved_courses() {
    const courses = typeof ctx.listSavedCourses === "function" ? ctx.listSavedCourses() : [];
    return { courses };
  }

  return {
    read_page, list_files, inspect_assignment, download_files,
    save_task, list_tasks, update_task, list_saved_courses
  };
}

globalThis.JimaTools = Object.freeze({ create: createJimaTools });
