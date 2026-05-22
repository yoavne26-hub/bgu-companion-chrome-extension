const JIMA_SAVED_TASKS_KEY = "jimaSavedTasks";

function normalizeJimaTaskText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeJimaTaskTitle(value) {
  return normalizeJimaTaskText(value).toLowerCase();
}

function normalizeJimaTaskUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    return url.toString();
  } catch {
    return normalizeJimaTaskText(value);
  }
}

function createJimaLocalId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `jima-task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function capJimaTaskText(value, limit) {
  const text = normalizeJimaTaskText(value);
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function extractJimaTaskDueDate(value) {
  const match = String(value || "").match(/\b(?:\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b/);
  return match?.[0] || "";
}

function sanitizeJimaTask(task) {
  const now = new Date().toISOString();
  return {
    id: normalizeJimaTaskText(task.id) || createJimaLocalId(),
    title: capJimaTaskText(task.title || "Possible task", 160),
    type: capJimaTaskText(task.type || "possible task", 60),
    courseOrPage: capJimaTaskText(task.courseOrPage || "", 160),
    sourceUrl: normalizeJimaTaskUrl(task.sourceUrl || ""),
    candidateUrl: normalizeJimaTaskUrl(task.candidateUrl || ""),
    dueDateRaw: capJimaTaskText(task.dueDateRaw || "", 40),
    evidence: capJimaTaskText(task.evidence || "", 250),
    confidence: normalizeJimaTaskText(task.confidence || "low").toLowerCase(),
    status: task.status === "done" ? "done" : "open",
    createdAt: normalizeJimaTaskText(task.createdAt) || now,
    updatedAt: normalizeJimaTaskText(task.updatedAt) || now
  };
}

function createJimaTaskFromCandidate(candidate, pageContext = {}) {
  const evidence = candidate?.evidence || "";
  return sanitizeJimaTask({
    title: candidate?.title || "Possible task",
    type: candidate?.type || "possible task",
    courseOrPage: pageContext.pageTitle || pageContext.documentTitle || "",
    sourceUrl: pageContext.currentUrl || pageContext.url || "",
    candidateUrl: candidate?.url || "",
    dueDateRaw: extractJimaTaskDueDate(`${candidate?.title || ""} ${evidence}`),
    evidence,
    confidence: candidate?.confidence || "low",
    status: "open"
  });
}

function isDuplicateJimaTask(existingTask, newTask) {
  const existingTitle = normalizeJimaTaskTitle(existingTask.title);
  const newTitle = normalizeJimaTaskTitle(newTask.title);
  if (!existingTitle || existingTitle !== newTitle) return false;

  const existingSource = normalizeJimaTaskUrl(existingTask.sourceUrl);
  const newSource = normalizeJimaTaskUrl(newTask.sourceUrl);
  const existingCandidate = normalizeJimaTaskUrl(existingTask.candidateUrl);
  const newCandidate = normalizeJimaTaskUrl(newTask.candidateUrl);

  return (
    (!!existingCandidate && !!newCandidate && existingCandidate === newCandidate) ||
    (!!existingSource && !!newSource && existingSource === newSource)
  );
}

async function getJimaSavedTasks() {
  const data = await chrome.storage.local.get(JIMA_SAVED_TASKS_KEY);
  return Array.isArray(data[JIMA_SAVED_TASKS_KEY])
    ? data[JIMA_SAVED_TASKS_KEY].map(sanitizeJimaTask)
    : [];
}

async function setJimaSavedTasks(tasks) {
  const sanitized = Array.isArray(tasks) ? tasks.map(sanitizeJimaTask) : [];
  await chrome.storage.local.set({ [JIMA_SAVED_TASKS_KEY]: sanitized });
  return sanitized;
}

async function saveJimaTask(taskInput) {
  const task = sanitizeJimaTask(taskInput);
  const tasks = await getJimaSavedTasks();
  const duplicate = tasks.find((existingTask) => isDuplicateJimaTask(existingTask, task));

  if (duplicate) {
    return {
      saved: false,
      duplicate: true,
      task: duplicate,
      tasks
    };
  }

  const updatedTasks = await setJimaSavedTasks([task, ...tasks]);
  return {
    saved: true,
    duplicate: false,
    task,
    tasks: updatedTasks
  };
}

async function updateJimaTaskStatus(taskId, status) {
  const tasks = await getJimaSavedTasks();
  const updatedAt = new Date().toISOString();
  const updatedTasks = tasks.map((task) => (
    task.id === taskId
      ? sanitizeJimaTask({ ...task, status: status === "done" ? "done" : "open", updatedAt })
      : task
  ));
  return setJimaSavedTasks(updatedTasks);
}

async function deleteJimaTask(taskId) {
  const tasks = await getJimaSavedTasks();
  return setJimaSavedTasks(tasks.filter((task) => task.id !== taskId));
}

function getJimaOpenTaskCount(tasks) {
  return (tasks || []).filter((task) => task.status !== "done").length;
}

globalThis.JimaTasks = Object.freeze({
  storageKey: JIMA_SAVED_TASKS_KEY,
  createTaskFromCandidate: createJimaTaskFromCandidate,
  deleteTask: deleteJimaTask,
  getOpenTaskCount: getJimaOpenTaskCount,
  getTasks: getJimaSavedTasks,
  isDuplicateTask: isDuplicateJimaTask,
  saveTask: saveJimaTask,
  updateTaskStatus: updateJimaTaskStatus
});
